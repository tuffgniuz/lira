import type { Item } from "@/models/workspace-item";
import type { JournalEntrySummary } from "@/models/journal";

type GoalProgressContext = {
  items: Item[];
  journalSummaries: JournalEntrySummary[];
  todayDate: string;
};

export type GoalProgressSnapshot = {
  completedCount: number;
  progressDenominator: number;
  progressPercent: number;
  isDirectCompletion: boolean;
  linkedTasks: Item[];
};

export function resolveGoalProgress(
  goal: Item,
  context: GoalProgressContext,
): GoalProgressSnapshot {
  const rawCompletedCount = goal.goalMetric === "tasks_completed"
    ? getAutomaticPeriodProgress(goal, context)
    : getDirectCompletionProgress(goal, context.todayDate);
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
    isDirectCompletion: !goal.goalMetric,
    linkedTasks,
  };
}

export function resolveGoalProgressForDate(
  goal: Item,
  context: GoalProgressContext,
  date: string,
) {
  if (!goal.goalMetric) {
    return getDirectCompletionForDate(goal, date, context.todayDate);
  }

  switch (goal.goalMetric) {
    case "tasks_completed":
      return getMatchingTasks(goal, context.items).filter((task) => task.completedAt === date).length;
    default:
      return 0;
  }
}

function getProgressDenominator(goal: Item) {
  return goal.goalTarget;
}

function getAutomaticPeriodProgress(goal: Item, context: GoalProgressContext) {
  switch (goal.goalMetric) {
    case "tasks_completed":
      return getMatchingTasks(goal, context.items).filter((task) =>
        isDateInCurrentPeriod(task.completedAt ?? "", context.todayDate, goal.goalPeriod),
      ).length;
    default:
      return 0;
  }
}

function getDirectCompletionProgress(goal: Item, todayDate: string) {
  const progressByDate = goal.goalProgressByDate ?? {};
  const matchingEntries = Object.entries(progressByDate).filter(([date]) =>
    isDateInCurrentPeriod(date, todayDate, goal.goalPeriod),
  );
  const completedInPeriod = matchingEntries.some(([, value]) => value > 0);

  if (completedInPeriod) {
    return 1;
  }

  return getDirectCompletionForDate(goal, todayDate, todayDate);
}

function getDirectCompletionForDate(goal: Item, date: string, todayDate: string) {
  const progressByDate = goal.goalProgressByDate ?? {};

  if (date in progressByDate) {
    return progressByDate[date] && progressByDate[date] > 0 ? 1 : 0;
  }

  if (date === todayDate) {
    return goal.goalProgress && goal.goalProgress > 0 ? 1 : 0;
  }

  return 0;
}

function getMatchingTasks(goal: Item, items: Item[]) {
  const scopedTasks = getScopedTasks(goal, items);
  const scopedTaskIds = new Set(goal.goalScope?.taskIds ?? []);

  if (scopedTasks.length > 0) {
    return scopedTasks.filter((item) => item.isCompleted);
  }

  return items.filter((item) => {
    if (item.kind !== "task" || item.state === "deleted" || !item.isCompleted) {
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
