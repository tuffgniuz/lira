import { describe, expect, it } from "vitest";
import type { Item } from "@/models/workspace-item";
import { buildRightRailContext } from "./right-rail-context";

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

describe("buildRightRailContext", () => {
  it("counts remaining tasks for today and returns active daily goals with progress", () => {
    const items = [
      createItem({ id: "task-1", title: "Task today", dueDate: "2026-03-17" }),
      createItem({ id: "task-2", title: "Due today", dueDate: "2026-03-17" }),
      createItem({ id: "task-3", title: "Done today", isCompleted: true, dueDate: "2026-03-17" }),
      createItem({ id: "goal-1", kind: "goal", title: "Close two tasks", goalPeriod: "daily", goalTarget: 2 }),
      createItem({ id: "done-1", title: "Done one", isCompleted: true, completedAt: "2026-03-17" }),
      createItem({ id: "goal-2", kind: "goal", title: "Weekly goal", goalPeriod: "weekly" }),
    ];

    const context = buildRightRailContext(items, [], "2026-03-17");

    expect(context.remainingTasksForToday).toBe(2);
    expect(context.goals).toEqual([
      {
        id: "goal-1",
        title: "Close two tasks",
        projectLabel: "",
        completedCount: 1,
        progressDenominator: 2,
        progressPercent: 50,
      },
    ]);
  });
});
