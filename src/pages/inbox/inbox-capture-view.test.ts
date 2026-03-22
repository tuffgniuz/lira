import { describe, expect, it } from "vitest";
import type { Project } from "@/models/project";
import type { Item } from "@/models/workspace-item";
import { defaultProjectBoardLanes } from "@/models/project-board";
import { buildInboxCaptureViews } from "./inbox-capture-view";

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "capture-1",
    kind: "capture",
    state: "inbox",
    sourceType: "capture",
    title: "Captured thought",
    content: "Captured thought",
    createdAt: "2026-03-21T12:00:00.000Z",
    updatedAt: "2026-03-21T12:00:00.000Z",
    tags: [],
    projectId: undefined,
    project: "",
    isCompleted: false,
    priority: "",
    dueDate: "",
    completedAt: "",
    estimate: "",
    goalTarget: 1,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    ...overrides,
  };
}

describe("buildInboxCaptureViews", () => {
  it("includes only capture records and resolves project names from project ids", () => {
    const projects: Project[] = [
      {
        id: "project-1",
        name: "Lira",
        description: "",
        hasKanbanBoard: true,
        boardLanes: defaultProjectBoardLanes("project-1"),
        createdAt: "2026-03-20T00:00:00.000Z",
        updatedAt: "2026-03-20T00:00:00.000Z",
      },
    ];

    const views = buildInboxCaptureViews(
      [
        createItem({
          id: "capture-1",
          content: "Build a browser",
          projectId: "project-1",
        }),
        createItem({
          id: "task-1",
          kind: "task",
          state: "active",
          sourceType: "capture",
          title: "Converted task",
          content: "Converted task",
        }),
        createItem({
          id: "capture-2",
          state: "deleted",
          content: "Deleted capture",
        }),
      ],
      projects,
    );

    expect(views).toEqual([
      expect.objectContaining({
        id: "capture-1",
        text: "Build a browser",
        projectName: "Lira",
      }),
    ]);
  });
});
