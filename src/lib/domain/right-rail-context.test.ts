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

    const context = buildRightRailContext(items, "2026-03-17");

    expect(context.remainingTasksForToday).toBe(2);
    expect(context.goals).toEqual([
      {
        id: "goal-1",
        title: "Close two tasks",
        metaLabel: "Tasks",
        completedCount: 1,
        progressDenominator: 2,
        progressPercent: 50,
        weekDays: [
          {
            date: "2026-03-16",
            label: "Monday",
            shortLabel: "Mon",
            status: { kind: "missed", label: "missed", symbol: "×" },
          },
          {
            date: "2026-03-17",
            label: "Tuesday",
            shortLabel: "Tue",
            status: { kind: "pending", label: "pending", symbol: "—" },
          },
          {
            date: "2026-03-18",
            label: "Wednesday",
            shortLabel: "Wed",
            status: { kind: "pending", label: "pending", symbol: "—" },
          },
          {
            date: "2026-03-19",
            label: "Thursday",
            shortLabel: "Thu",
            status: { kind: "pending", label: "pending", symbol: "—" },
          },
          {
            date: "2026-03-20",
            label: "Friday",
            shortLabel: "Fri",
            status: { kind: "pending", label: "pending", symbol: "—" },
          },
          {
            date: "2026-03-21",
            label: "Saturday",
            shortLabel: "Sat",
            status: { kind: "pending", label: "pending", symbol: "—" },
          },
          {
            date: "2026-03-22",
            label: "Sunday",
            shortLabel: "Sun",
            status: { kind: "pending", label: "pending", symbol: "—" },
          },
        ],
      },
    ]);
  });
});
