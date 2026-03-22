import { describe, expect, it } from "vitest";
import type { Item } from "@/models/workspace-item";
import { resolveGoalProgress, resolveGoalProgressForDate } from "./goal-progress";

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    kind: "goal",
    state: "active",
    sourceType: "manual",
    title: "Goal",
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

describe("goal progress", () => {
  it("counts completed tasks in the active period using project scope", () => {
    const goal = createItem({
      goalScope: { projectId: "project-1" },
    });
    const items = [
      createItem({
        id: "task-1",
        kind: "task",
        isCompleted: true,
        completedAt: "2026-03-16",
        projectId: "project-1",
      }),
      createItem({
        id: "task-2",
        kind: "task",
        isCompleted: true,
        completedAt: "2026-03-10",
        projectId: "project-1",
      }),
      createItem({
        id: "task-3",
        kind: "task",
        isCompleted: true,
        completedAt: "2026-03-16",
        projectId: "project-2",
      }),
    ];

    const progress = resolveGoalProgress(goal, {
      items,
      journalSummaries: [],
      todayDate: "2026-03-16",
    });

    expect(progress.completedCount).toBe(1);
    expect(progress.progressDenominator).toBe(3);
    expect(progress.linkedTasks).toHaveLength(0);
  });

  it("keeps all explicitly linked tasks visible while counting only completed ones", () => {
    const goal = createItem({
      goalTarget: 5,
      goalScope: { taskIds: ["task-1", "task-2"] },
    });
    const items = [
      createItem({
        id: "task-1",
        kind: "task",
        isCompleted: true,
        completedAt: "2026-03-16",
      }),
      createItem({
        id: "task-2",
        kind: "task",
        isCompleted: false,
      }),
    ];

    const progress = resolveGoalProgress(goal, {
      items,
      journalSummaries: [],
      todayDate: "2026-03-16",
    });

    expect(progress.completedCount).toBe(1);
    expect(progress.progressDenominator).toBe(5);
    expect(progress.linkedTasks).toHaveLength(2);
  });

  it("allows a metric-less goal to be marked complete for the current period", () => {
    const goal = createItem({
      goalMetric: undefined,
      goalTarget: 1,
      goalPeriod: "weekly",
      goalProgressByDate: {
        "2026-03-16": 1,
      },
    });

    const progress = resolveGoalProgress(goal, {
      items: [],
      journalSummaries: [],
      todayDate: "2026-03-16",
    });

    expect(progress.completedCount).toBe(1);
    expect(resolveGoalProgressForDate(goal, {
      items: [],
      journalSummaries: [],
      todayDate: "2026-03-16",
    }, "2026-03-16")).toBe(1);
  });
});
