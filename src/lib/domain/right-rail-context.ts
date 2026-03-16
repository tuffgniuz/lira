import type { Item } from "../../models/item";
import type { JournalEntrySummary } from "../../models/journal";
import { resolveGoalProgress } from "./goal-progress";

export type RightRailGoal = {
  id: string;
  title: string;
  completedCount: number;
  progressDenominator: number;
  progressPercent: number;
};

export type RightRailContext = {
  remainingTasksForToday: number;
  goals: RightRailGoal[];
};

export function buildRightRailContext(
  items: Item[],
  journalSummaries: JournalEntrySummary[],
  todayDate: string,
): RightRailContext {
  const remainingTasksForToday = items.filter(
    (item) =>
      item.kind === "task" &&
      item.state !== "deleted" &&
      item.taskStatus !== "done" &&
      (item.dueDate === todayDate || item.taskStatus === "today"),
  ).length;

  const goals = items
    .filter((item) => item.kind === "goal" && item.state === "active" && item.goalPeriod === "daily")
    .map((goal) => {
      const progress = resolveGoalProgress(goal, {
        items,
        journalSummaries,
        todayDate,
      });

      return {
        id: goal.id,
        title: goal.title,
        completedCount: progress.completedCount,
        progressDenominator: progress.progressDenominator,
        progressPercent: progress.progressPercent,
      };
    });

  return {
    remainingTasksForToday,
    goals,
  };
}
