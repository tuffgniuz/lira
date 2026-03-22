import type { Item } from "@/models/workspace-item";
import type { JournalEntrySummary } from "@/models/journal";
import { resolveGoalProgress } from "./goal-progress";

export type RightRailGoal = {
  id: string;
  title: string;
  projectLabel: string;
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
      !item.isCompleted &&
      item.dueDate === todayDate,
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
        projectLabel: goal.project,
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
