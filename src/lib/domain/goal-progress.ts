import type { Item } from "../../models/item";
import type { JournalEntrySummary } from "../../models/journal";

type GoalProgressContext = {
  items: Item[];
  journalSummaries: JournalEntrySummary[];
  todayDate: string;
};

export type GoalProgressSnapshot = {
  completedCount: number;
  progressDenominator: number;
  progressPercent: number;
  isManual: boolean;
  linkedTasks: Item[];
};

export function resolveGoalProgress(
  goal: Item,
  context: GoalProgressContext,
): GoalProgressSnapshot {
  const rawCompletedCount = goal.goalTrackingMode === "manual"
    ? getManualPeriodProgress(goal, context.todayDate)
    : getAutomaticPeriodProgress(goal, context);
  const completedCount = Math.max(
    0,
    Math.min(rawCompletedCount, getProgressDenominator(goal)),
  );
  const linkedTasks = goal.goalScope?.taskIds?.length
    ? getScopedTasks(goal, context.items)
    : [];
  const progressDenominator = getProgressDenominator(goal);

  return {
    completedCount,
    progressDenominator,
    progressPercent:
      progressDenominator > 0
        ? Math.min(100, Math.max(0, (completedCount / progressDenominator) * 100))
        : 0,
    isManual: goal.goalTrackingMode === "manual",
    linkedTasks,
  };
}

export function resolveGoalProgressForDate(
  goal: Item,
  context: GoalProgressContext,
  date: string,
) {
  if (goal.goalTrackingMode === "manual") {
    return getManualProgressForDate(goal, date, context.todayDate);
  }

  switch (goal.goalMetric) {
    case "tasks_completed":
      return getMatchingTasks(goal, context.items).filter((task) => task.completedAt === date).length;
    case "journal_entries_written":
      return context.journalSummaries.some((entry) => entry.date === date) ? 1 : 0;
    default:
      return 0;
  }
}

function getProgressDenominator(goal: Item) {
  if (
    goal.goalTrackingMode === "automatic" &&
    goal.goalMetric === "tasks_completed" &&
    goal.goalScope?.taskIds?.length
  ) {
    return goal.goalScope.taskIds.length;
  }

  return goal.goalTarget;
}

function getAutomaticPeriodProgress(goal: Item, context: GoalProgressContext) {
  switch (goal.goalMetric) {
    case "tasks_completed":
      return getMatchingTasks(goal, context.items).filter((task) =>
        isDateInCurrentPeriod(task.completedAt ?? "", context.todayDate, goal.goalPeriod),
      ).length;
    case "journal_entries_written":
      return context.journalSummaries.filter((entry) =>
        isDateInCurrentPeriod(entry.date, context.todayDate, goal.goalPeriod),
      ).length;
    default:
      return 0;
  }
}

function getManualPeriodProgress(goal: Item, todayDate: string) {
  const progressByDate = goal.goalProgressByDate ?? {};
  const matchingEntries = Object.entries(progressByDate).filter(([date]) =>
    isDateInCurrentPeriod(date, todayDate, goal.goalPeriod),
  );
  const summedProgress = matchingEntries.reduce((total, [, value]) => total + value, 0);

  if (summedProgress > 0) {
    return summedProgress;
  }

  return getManualProgressForDate(goal, todayDate, todayDate);
}

function getManualProgressForDate(goal: Item, date: string, todayDate: string) {
  const progressByDate = goal.goalProgressByDate ?? {};

  if (date in progressByDate) {
    return Math.max(0, Math.min(progressByDate[date] ?? 0, goal.goalTarget));
  }

  if (date === todayDate) {
    return Math.max(0, Math.min(goal.goalProgress ?? 0, goal.goalTarget));
  }

  return 0;
}

function getMatchingTasks(goal: Item, items: Item[]) {
  const scopedTasks = getScopedTasks(goal, items);
  const scopedTaskIds = new Set(goal.goalScope?.taskIds ?? []);

  if (scopedTasks.length > 0) {
    return scopedTasks.filter((item) => item.taskStatus === "done");
  }

  return items.filter((item) => {
    if (item.kind !== "task" || item.state === "deleted" || item.taskStatus !== "done") {
      return false;
    }

    if (scopedTaskIds.size > 0) {
      return scopedTaskIds.has(item.id);
    }

    if (goal.goalScope?.projectId && item.projectId !== goal.goalScope.projectId) {
      return false;
    }

    if (goal.goalScope?.tag && !item.tags.includes(goal.goalScope.tag)) {
      return false;
    }

    return true;
  });
}

function getScopedTasks(goal: Item, items: Item[]) {
  const scopedTaskIds = new Set(goal.goalScope?.taskIds ?? []);

  if (scopedTaskIds.size === 0) {
    return [];
  }

  return items.filter(
    (item) => item.kind === "task" && item.state !== "deleted" && scopedTaskIds.has(item.id),
  );
}

function isDateInCurrentPeriod(date: string, todayDate: string, period: Item["goalPeriod"]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(todayDate)) {
    return false;
  }

  switch (period) {
    case "daily":
      return date === todayDate;
    case "weekly":
      return getWeekKey(date) === getWeekKey(todayDate);
    case "monthly":
      return date.slice(0, 7) === todayDate.slice(0, 7);
    case "yearly":
      return date.slice(0, 4) === todayDate.slice(0, 4);
    default:
      return false;
  }
}

function getWeekKey(date: string) {
  const current = new Date(`${date}T00:00:00`);
  const mondayOffset = current.getDay() === 0 ? -6 : 1 - current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() + mondayOffset);
  return monday.toISOString().slice(0, 10);
}
