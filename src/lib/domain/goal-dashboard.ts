import type { Item } from "@/models/workspace-item";
import { resolveGoalProgress } from "./goal-progress";

export type GoalDashboardRangeDays = 7 | 14 | 30;
export type GoalDashboardStatus = "on_track" | "at_risk" | "behind";

export type GoalDashboardPoint = {
  date: string;
  actualCumulative: number;
  expectedCumulative: number;
  pacePercent: number;
};

export type GoalDashboardHeatCell = {
  date: string;
  ratio: number;
};

export type GoalDashboardGoal = {
  id: string;
  title: string;
  status: GoalDashboardStatus;
  paceRatio: number;
  completionRatio: number;
  currentValue: number;
  targetValue: number;
  colorToken: string;
  series: GoalDashboardPoint[];
  weeklyHeat: GoalDashboardHeatCell[];
};

export type GoalDashboardModel = {
  goals: GoalDashboardGoal[];
  summary: {
    total: number;
    onTrack: number;
    atRisk: number;
    behind: number;
  };
};

const goalColorTokens = [
  "var(--goal-chart-1)",
  "var(--goal-chart-2)",
  "var(--goal-chart-3)",
  "var(--goal-chart-4)",
  "var(--goal-chart-5)",
  "var(--goal-chart-6)",
];

export function buildGoalDashboardModel({
  items,
  todayDate,
  rangeDays,
}: {
  items: Item[];
  todayDate: string;
  rangeDays: GoalDashboardRangeDays;
}): GoalDashboardModel {
  const goals = items.filter((item) => item.kind === "goal" && item.state === "active");
  const rangeDates = buildDateRange(todayDate, rangeDays);
  const weeklyDates = buildDateRange(todayDate, 7);

  const goalModels = goals.map((goal, index) => {
    const targetValue = Math.max(1, goal.goalTarget || 1);
    const progress = resolveGoalProgress(goal, { items, todayDate });
    const currentValue = Math.max(0, progress.completedCount);
    const completionRatio = targetValue > 0 ? currentValue / targetValue : 0;
    const expectedToDate = Math.max(1, expectedProgressToDate(goal, todayDate));
    const paceRatio = currentValue / expectedToDate;
    const status = classifyGoalStatus(completionRatio);
    const series = buildSeries(goal, items, todayDate, rangeDates);
    const weeklyHeat = weeklyDates.map((date) => {
      const expected = expectedPerDay(goal, date);
      const actual = dailyDelta(goal, items, date, todayDate);

      return {
        date,
        ratio: expected > 0 ? Math.max(0, Math.min(1, actual / expected)) : 0,
      };
    });

    return {
      id: goal.id,
      title: goal.title,
      status,
      paceRatio,
      completionRatio,
      currentValue,
      targetValue,
      colorToken: goalColorTokens[index % goalColorTokens.length] ?? goalColorTokens[0],
      series,
      weeklyHeat,
    };
  });

  const summary = {
    total: goalModels.length,
    onTrack: goalModels.filter((goal) => goal.status === "on_track").length,
    atRisk: goalModels.filter((goal) => goal.status === "at_risk").length,
    behind: goalModels.filter((goal) => goal.status === "behind").length,
  };

  return {
    goals: goalModels,
    summary,
  };
}

function buildSeries(goal: Item, items: Item[], todayDate: string, dates: string[]): GoalDashboardPoint[] {
  let runningActual = 0;
  let runningExpected = 0;

  return dates.map((date) => {
    runningActual += dailyDelta(goal, items, date, todayDate);
    runningExpected += expectedPerDay(goal, date);

    return {
      date,
      actualCumulative: runningActual,
      expectedCumulative: runningExpected,
      pacePercent: runningExpected > 0 ? (runningActual / runningExpected) * 100 : 0,
    };
  });
}

function classifyGoalStatus(completionRatio: number): GoalDashboardStatus {
  if (completionRatio >= 1) {
    return "on_track";
  }

  if (completionRatio >= 0.8) {
    return "at_risk";
  }

  return "behind";
}

function expectedProgressToDate(goal: Item, todayDate: string) {
  const target = Math.max(1, goal.goalTarget || 1);

  switch (goal.goalPeriod) {
    case "daily":
      return target;
    case "weekly":
      return target * (getWeekdayIndex(todayDate) / 7);
    case "monthly": {
      const day = getDayOfMonth(todayDate);
      const daysInMonth = getDaysInMonth(todayDate);
      return target * (day / daysInMonth);
    }
    case "yearly": {
      const dayOfYear = getDayOfYear(todayDate);
      const daysInYear = getDaysInYear(todayDate);
      return target * (dayOfYear / daysInYear);
    }
    default:
      return target;
  }
}

function expectedPerDay(goal: Item, date: string) {
  const target = Math.max(1, goal.goalTarget || 1);

  if (isGoalOffDay(goal, date)) {
    return 0;
  }

  switch (goal.goalPeriod) {
    case "daily":
      return target;
    case "weekly":
      return target / 7;
    case "monthly":
      return target / getDaysInMonth(date);
    case "yearly":
      return target / getDaysInYear(date);
    default:
      return target / 7;
  }
}

function dailyDelta(goal: Item, items: Item[], date: string, todayDate: string) {
  if (isGoalOffDay(goal, date)) {
    return 0;
  }

  if (goal.goalMilestones?.length) {
    return goal.goalMilestones.filter((milestone) => milestone.completedAt === date).length;
  }

  if (goal.goalMetric === "tasks_completed") {
    return getMatchingTasks(goal, items).filter((task) => task.completedAt === date).length;
  }

  const progressByDate = goal.goalProgressByDate ?? {};
  const recorded = progressByDate[date];

  if (typeof recorded === "number") {
    return Math.max(0, recorded);
  }

  if (date === todayDate) {
    return Math.max(0, goal.goalProgress ?? 0);
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

function isGoalOffDay(goal: Item, date: string) {
  if (goal.goalPeriod !== "daily") {
    return false;
  }

  const scheduleDays = goal.goalScheduleDays ?? [];

  if (scheduleDays.length === 0) {
    return false;
  }

  const weekday = getWeekdayName(date);
  return weekday ? !scheduleDays.includes(weekday) : false;
}

function getWeekdayName(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const current = new Date(`${date}T00:00:00`);
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;

  return weekdays[current.getDay()] ?? null;
}

function buildDateRange(endDate: string, days: number) {
  const end = parseDate(endDate);
  const result: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(end);
    current.setDate(end.getDate() - offset);
    result.push(formatDate(current));
  }

  return result;
}

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function formatDate(date: Date) {
  return [
    `${date.getFullYear()}`,
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0"),
  ].join("-");
}

function getWeekdayIndex(date: string) {
  const day = parseDate(date).getDay();
  return day === 0 ? 7 : day;
}

function getDayOfMonth(date: string) {
  return parseDate(date).getDate();
}

function getDaysInMonth(date: string) {
  const current = parseDate(date);
  return new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
}

function getDayOfYear(date: string) {
  const current = parseDate(date);
  const start = new Date(current.getFullYear(), 0, 0);
  const diff = current.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function getDaysInYear(date: string) {
  const year = parseDate(date).getFullYear();
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}
