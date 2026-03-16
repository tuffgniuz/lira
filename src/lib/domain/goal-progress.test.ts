import { describe, expect, it } from "vitest";
import type { Item } from "../../models/item";
import type { JournalEntrySummary } from "../../models/journal";
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
    taskStatus: "inbox",
    priority: "",
    dueDate: "",
    completedAt: "",
    estimate: "",
    goalMetric: "tasks_completed",
    goalTarget: 3,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    goalTrackingMode: "automatic",
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
        taskStatus: "done",
        completedAt: "2026-03-16",
        projectId: "project-1",
      }),
      createItem({
        id: "task-2",
        kind: "task",
        taskStatus: "done",
        completedAt: "2026-03-10",
        projectId: "project-1",
      }),
      createItem({
        id: "task-3",
        kind: "task",
        taskStatus: "done",
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
      goalTarget: 99,
      goalScope: { taskIds: ["task-1", "task-2"] },
    });
    const items = [
      createItem({
        id: "task-1",
        kind: "task",
        taskStatus: "done",
        completedAt: "2026-03-16",
      }),
      createItem({
        id: "task-2",
        kind: "task",
        taskStatus: "today",
      }),
    ];

    const progress = resolveGoalProgress(goal, {
      items,
      journalSummaries: [],
      todayDate: "2026-03-16",
    });

    expect(progress.completedCount).toBe(1);
    expect(progress.progressDenominator).toBe(2);
    expect(progress.linkedTasks).toHaveLength(2);
  });

  it("counts journal entries for automatic journal goals", () => {
    const goal = createItem({
      goalMetric: "journal_entries_written",
      goalTarget: 2,
      goalPeriod: "monthly",
    });
    const journalSummaries: JournalEntrySummary[] = [
      { date: "2026-03-16", preview: "one" },
      { date: "2026-03-14", preview: "two" },
      { date: "2026-02-28", preview: "other month" },
    ];

    const progress = resolveGoalProgress(goal, {
      items: [],
      journalSummaries,
      todayDate: "2026-03-16",
    });

    expect(progress.completedCount).toBe(2);
    expect(resolveGoalProgressForDate(goal, {
      items: [],
      journalSummaries,
      todayDate: "2026-03-16",
    }, "2026-03-14")).toBe(1);
  });

  it("sums manual progress entries across the active period", () => {
    const goal = createItem({
      goalTrackingMode: "manual",
      goalMetric: "manual_units",
      goalTarget: 5,
      goalPeriod: "monthly",
      goalProgressByDate: {
        "2026-03-15": 2,
        "2026-03-16": 1,
        "2026-03-01": 4,
      },
    });

    const progress = resolveGoalProgress(goal, {
      items: [],
      journalSummaries: [],
      todayDate: "2026-03-16",
    });

    expect(progress.completedCount).toBe(5);
    expect(resolveGoalProgressForDate(goal, {
      items: [],
      journalSummaries: [],
      todayDate: "2026-03-16",
    }, "2026-03-15")).toBe(2);
  });
});
