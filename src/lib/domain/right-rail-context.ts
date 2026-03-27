import type { Item } from "@/models/workspace-item";
import {
  formatGoalMetricLabel,
  getCurrentGoalWeekDays,
  resolveGoalWeekDayStatus,
} from "./goal-display";
import { resolveGoalProgress } from "./goal-progress";

export type RightRailGoalWeekDay = {
  date: string;
  label: string;
  shortLabel: string;
  status: {
    kind: "met" | "missed" | "pending" | "off-day";
    label: string;
    symbol: string;
  };
};

export type RightRailGoal = {
  id: string;
  title: string;
  metaLabel: string;
  completedCount: number;
  progressDenominator: number;
  progressPercent: number;
  weekDays: RightRailGoalWeekDay[];
};

export type RightRailContext = {
  remainingTasksForToday: number;
  goals: RightRailGoal[];
  streaks: Array<{
    goalId: string;
    goalTitle: string;
    currentStreakDays: number;
    bestStreakDays: number;
  }>;
  consistency: {
    score: number;
    metDays: number;
    missedDays: number;
    offDays: number;
    deltaFromPreviousWeek: number;
  };
};

export function buildRightRailContext(
  items: Item[],
  todayDate: string,
): RightRailContext {
  const dailyGoals = items.filter(
    (item) => item.kind === "goal" && item.state === "active" && item.goalPeriod === "daily",
  );
  const remainingTasksForToday = items.filter(
    (item) =>
      item.kind === "task" &&
      item.state !== "deleted" &&
      !item.isCompleted &&
      item.dueDate === todayDate,
  ).length;

  const goals = dailyGoals.map((goal) => {
      const progress = resolveGoalProgress(goal, {
        items,
        todayDate,
      });
      const metricLabel = formatGoalMetricLabel(goal);
      const metaLabel = goal.project ? `${goal.project} • ${metricLabel}` : metricLabel;
      const weekDays = getCurrentGoalWeekDays(todayDate).map((day) => ({
        date: day.date,
        label: day.label,
        shortLabel: day.shortLabel,
        status: resolveGoalWeekDayStatus(
          goal,
          {
            items,
            todayDate,
          },
          day.date,
          todayDate,
        ),
      }));

      return {
        id: goal.id,
        title: goal.title,
        metaLabel,
        completedCount: progress.completedCount,
        progressDenominator: progress.progressDenominator,
        progressPercent: progress.progressPercent,
        weekDays,
      };
    });

  const streaks = dailyGoals
    .map((goal) => ({
      goalId: goal.id,
      goalTitle: goal.title,
      ...buildGoalStreak(goal, items, todayDate),
    }))
    .sort((left, right) => right.currentStreakDays - left.currentStreakDays);

  const consistency = buildConsistencySnapshot(dailyGoals, items, todayDate);

  return {
    remainingTasksForToday,
    goals,
    streaks,
    consistency,
  };
}

function buildGoalStreak(goal: Item, items: Item[], todayDate: string) {
  const context = { items, todayDate };
  const maxLookbackDays = 90;
  let currentStreakDays = 0;
  let bestStreakDays = 0;
  let running = 0;
  let countingCurrent = true;

  for (let offset = 0; offset < maxLookbackDays; offset += 1) {
    const date = shiftDate(todayDate, -offset);
    const status = resolveGoalWeekDayStatus(goal, context, date, todayDate);

    if (status.kind === "off-day") {
      continue;
    }

    if (status.kind === "met") {
      running += 1;

      if (countingCurrent) {
        currentStreakDays += 1;
      }
    } else {
      countingCurrent = false;
      running = 0;
    }

    bestStreakDays = Math.max(bestStreakDays, running);
  }

  return {
    currentStreakDays,
    bestStreakDays,
  };
}

function buildConsistencySnapshot(goals: Item[], items: Item[], todayDate: string) {
  const currentWeekDates = getCurrentGoalWeekDays(todayDate)
    .map((day) => day.date)
    .filter((date) => date <= todayDate);
  const previousWeekDates = currentWeekDates.map((date) => shiftDate(date, -7));

  const current = countWeekStatuses(goals, items, currentWeekDates, todayDate);
  const previousWeekReferenceDate = previousWeekDates[previousWeekDates.length - 1] ?? shiftDate(todayDate, -7);
  const previous = countWeekStatuses(goals, items, previousWeekDates, previousWeekReferenceDate);
  const score = scoreFromCounts(current.metDays, current.missedDays);
  const previousScore = scoreFromCounts(previous.metDays, previous.missedDays);

  return {
    score,
    metDays: current.metDays,
    missedDays: current.missedDays,
    offDays: current.offDays,
    deltaFromPreviousWeek: score - previousScore,
  };
}

function countWeekStatuses(goals: Item[], items: Item[], dates: string[], referenceTodayDate: string) {
  let metDays = 0;
  let missedDays = 0;
  let offDays = 0;

  for (const goal of goals) {
    for (const date of dates) {
      const status = resolveGoalWeekDayStatus(goal, { items, todayDate: referenceTodayDate }, date, referenceTodayDate);

      if (status.kind === "met") {
        metDays += 1;
      } else if (status.kind === "missed") {
        missedDays += 1;
      } else if (status.kind === "off-day") {
        offDays += 1;
      }
    }
  }

  return { metDays, missedDays, offDays };
}

function scoreFromCounts(metDays: number, missedDays: number) {
  const denominator = metDays + missedDays;

  if (denominator <= 0) {
    return 0;
  }

  return Math.round((metDays / denominator) * 100);
}

function shiftDate(date: string, days: number) {
  const current = new Date(`${date}T00:00:00`);
  current.setDate(current.getDate() + days);
  const year = `${current.getFullYear()}`;
  const month = `${current.getMonth() + 1}`.padStart(2, "0");
  const day = `${current.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
