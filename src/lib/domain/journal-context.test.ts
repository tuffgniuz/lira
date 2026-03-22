import { describe, expect, it } from "vitest";
import type { Item } from "@/models/workspace-item";
import { buildJournalContext } from "./journal-context";

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    kind: "task",
    state: "active",
    sourceType: "manual",
    title: "Item",
    content: "",
    createdAt: "",
    updatedAt: "",
    tags: [],
    project: "",
    isCompleted: false,
    priority: "",
    dueDate: "",
    completedAt: "",
    estimate: "",
    goalMetric: "tasks_completed",
    goalTarget: 3,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    ...overrides,
  };
}

describe("buildJournalContext", () => {
  it("returns today tasks and active goals with progress", () => {
    const items = [
      createItem({
        id: "task-1",
        title: "Ship the journal UI",
        dueDate: "2026-03-17",
      }),
      createItem({
        id: "goal-1",
        kind: "goal",
        title: "Close two tasks today",
        goalPeriod: "daily",
        goalTarget: 2,
      }),
      createItem({
        id: "task-2",
        title: "Close one task",
        isCompleted: true,
        completedAt: "2026-03-17",
      }),
      createItem({
        id: "goal-2",
        kind: "goal",
        state: "archived",
        title: "Archived goal",
      }),
    ];

    const context = buildJournalContext("2026-03-17", "2026-03-17", items, []);

    expect(context.tasksForToday).toEqual(["Ship the journal UI"]);
    expect(context.goalsForToday).toEqual(["Close two tasks today - 1 / 2"]);
  });

  it("orders active goals from daily to yearly", () => {
    const items = [
      createItem({
        id: "goal-1",
        kind: "goal",
        title: "Yearly theme",
        goalPeriod: "yearly",
      }),
      createItem({
        id: "goal-2",
        kind: "goal",
        title: "Daily target",
        goalPeriod: "daily",
      }),
      createItem({
        id: "goal-3",
        kind: "goal",
        title: "Weekly momentum",
        goalPeriod: "weekly",
      }),
    ];

    const context = buildJournalContext("2026-03-17", "2026-03-17", items, []);

    expect(context.goalsForToday).toEqual([
      "Daily target - 0 / 3",
      "Weekly momentum - 0 / 3",
      "Yearly theme - 0 / 3",
    ]);
  });
});
