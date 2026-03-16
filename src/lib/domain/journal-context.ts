import type { Item } from "../../models/item";
import type { JournalEntrySummary } from "../../models/journal";
import { resolveGoalProgress } from "./goal-progress";

export function buildJournalContext(
  selectedDate: string,
  todayDate: string,
  items: Item[],
  journalSummaries: JournalEntrySummary[],
) {
  const tasksForToday = items
    .filter(
      (item) =>
        item.kind === "task" &&
        item.state !== "deleted" &&
        (item.dueDate === selectedDate || item.taskStatus === "today"),
    )
    .map((item) => item.title)
    .slice(0, 5);

  const goalsForToday = items
    .filter((item) => item.kind === "goal" && item.state === "active")
    .sort((left, right) => compareGoalPeriod(left.goalPeriod, right.goalPeriod))
    .map((goal) => {
      const progress = resolveGoalProgress(goal, {
        items,
        journalSummaries,
        todayDate,
      });

      return `${goal.title} - ${progress.completedCount} / ${progress.progressDenominator}`;
    })
    .slice(0, 5);

  return {
    tasksForToday,
    goalsForToday,
  };
}

function compareGoalPeriod(left: Item["goalPeriod"], right: Item["goalPeriod"]) {
  const order = ["daily", "weekly", "monthly", "yearly"];
  return order.indexOf(left) - order.indexOf(right);
}
