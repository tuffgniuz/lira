import { describe, expect, it } from "vitest";
import type { Item } from "../../models/workspace-item";
import type { Project } from "../../models/project";
import { defaultProjectBoardLanes } from "../../models/project-board";
import {
  attachProjectIdsFromNames,
  clearProjectReferences,
  getProjectName,
} from "./project-relations";

const projects: Project[] = [
  {
    id: "project-1",
    name: "Alpha",
    description: "",
    boardLanes: defaultProjectBoardLanes("project-1"),
    createdAt: "2026-03-16T00:00:00.000Z",
    updatedAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: "project-2",
    name: "Beta",
    description: "",
    boardLanes: defaultProjectBoardLanes("project-2"),
    createdAt: "2026-03-16T00:00:00.000Z",
    updatedAt: "2026-03-16T00:00:00.000Z",
  },
];

function createTask(overrides: Partial<Item> = {}): Item {
  return {
    id: "task-1",
    kind: "task",
    state: "active",
    sourceType: "manual",
    title: "Task",
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
    goalTarget: 1,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    ...overrides,
  };
}

describe("project relations", () => {
  it("hydrates missing task project ids from legacy project names", () => {
    const items = [
      createTask({ id: "task-1", project: "Alpha" }),
      createTask({ id: "task-2", project: "Missing" }),
      createTask({ id: "task-3", projectId: "project-2", project: "Beta" }),
    ];

    const normalized = attachProjectIdsFromNames(items, projects);

    expect(normalized[0]?.projectId).toBe("project-1");
    expect(normalized[1]?.projectId).toBeUndefined();
    expect(normalized[2]?.projectId).toBe("project-2");
  });

  it("resolves project names from stable ids", () => {
    expect(getProjectName(projects, "project-2", "")).toBe("Beta");
    expect(getProjectName(projects, undefined, "Legacy Name")).toBe("Legacy Name");
    expect(getProjectName(projects, "missing", "Legacy Name")).toBe("Legacy Name");
  });

  it("clears linked tasks and goal scopes when a project is deleted", () => {
    const items = [
      createTask({ id: "task-1", projectId: "project-1", project: "Alpha" }),
      createTask({ id: "task-2", projectId: "project-2", project: "Beta" }),
      createTask({
        id: "goal-1",
        kind: "goal",
        project: "",
        goalScope: { projectId: "project-1", tag: "deep-work" },
      }),
    ];

    const normalized = clearProjectReferences(items, "project-1");

    expect(normalized[0]).toMatchObject({ projectId: undefined, project: "" });
    expect(normalized[1]).toMatchObject({ projectId: "project-2", project: "Beta" });
    expect(normalized[2]?.goalScope).toEqual({ tag: "deep-work" });
  });
});
