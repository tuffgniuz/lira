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
};

export function buildRightRailContext(
  items: Item[],
  todayDate: string,
): RightRailContext {
  const remainingTasksForToday = items.filter(
    (item) =>
      item.kind === "task" &&
      item.state !== "deleted" &&
      !item.isCompleted &&
      item.dueDate === todayDate,
  ).length;

  const goals = items
    .filter((item) => item.kind === "goal" && item.state === "active" && item.goalPeriod === "daily")
    .map((goal) => {
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

  return {
    remainingTasksForToday,
    goals,
  };
}
