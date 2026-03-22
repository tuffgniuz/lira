import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsPage } from "./projects-page";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Lira",
    description: "Build the workflow shell.",
    boardLanes: [
      { id: "project-1-lane-to-do", name: "To Do", order: 0 },
      { id: "project-1-lane-in-progress", name: "In Progress", order: 1 },
      { id: "project-1-lane-done", name: "Done", order: 2 },
    ],
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
    ...overrides,
  };
}

function createTask(overrides: Partial<Item> = {}): Item {
  return {
    id: "task-1",
    kind: "task",
    state: "active",
    sourceType: "manual",
    title: "Review shell flow",
    content: "",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
    tags: [],
    projectId: "project-1",
    projectLaneId: undefined,
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

function renderProjectsPage({
  projects = [createProject()],
  items = [],
}: {
  projects?: Project[];
  items?: Item[];
} = {}) {
  const onUpdateProject = vi.fn();
  const onUpdateTask = vi.fn();
  const onCreateTask = vi.fn(() => "task-created");
  const onSelectTask = vi.fn();

  render(
    <ProjectsPage
      projects={projects}
      items={items}
      selectedProjectId="project-1"
      onUpdateProject={onUpdateProject}
      onUpdateTask={onUpdateTask}
      onCreateTask={onCreateTask}
      onSelectTask={onSelectTask}
    />,
  );

  return {
    onUpdateProject,
    onUpdateTask,
    onCreateTask,
    onSelectTask,
  };
}

describe("ProjectsPage board", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a board-first layout with project tasks grouped by lane", () => {
    renderProjectsPage({
      items: [
        createTask({
          id: "task-1",
          title: "Backlog task",
        }),
        createTask({
          id: "task-2",
          title: "Active task",
          projectLaneId: "project-1-lane-in-progress",
        }),
        createTask({
          id: "task-3",
          title: "Other project task",
          projectId: "project-2",
        }),
      ],
    });

    expect(screen.getByRole("heading", { name: "Lira" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show project detail in three-column layout" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projects list")).not.toBeInTheDocument();

    const toDoLane = screen.getByLabelText("To Do lane");
    const inProgressLane = screen.getByLabelText("In Progress lane");
    const doneLane = screen.getByLabelText("Done lane");

    expect(within(toDoLane).getByText("Backlog task")).toBeInTheDocument();
    expect(within(inProgressLane).getByText("Active task")).toBeInTheDocument();
    expect(within(doneLane).queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByText("Other project task")).not.toBeInTheDocument();
  });

  it("shows updated or created timestamps plus due date and priority when present", () => {
    renderProjectsPage({
      items: [
        createTask({
          id: "task-meta",
          title: "Meta rich task",
          priority: "high",
          dueDate: "2026-03-25",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-19T12:00:00.000Z",
        }),
        createTask({
          id: "task-created",
          title: "Created only task",
          createdAt: "2026-03-20T12:00:00.000Z",
          updatedAt: "2026-03-20T12:00:00.000Z",
        }),
      ],
    });

    const metaTask = screen.getByLabelText("Task card Meta rich task");
    const updatedTimestamp = within(metaTask).getByText("UPDATED YESTERDAY");
    const metaTaskTitle = within(metaTask).getByText("Meta rich task");
    expect(updatedTimestamp).toBeInTheDocument();
    expect(
      updatedTimestamp.compareDocumentPosition(metaTaskTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(metaTask).getByText("HIGH")).toBeInTheDocument();
    expect(within(metaTask).getByText("DUE 2026-03-25")).toBeInTheDocument();

    const createdOnlyTask = screen.getByLabelText("Task card Created only task");
    expect(within(createdOnlyTask).getByText("CREATED NOW")).toBeInTheDocument();
    expect(within(createdOnlyTask).queryByText(/^DUE /)).not.toBeInTheDocument();
    expect(within(createdOnlyTask).queryByText(/LOW|MEDIUM|HIGH|URGENT/)).not.toBeInTheDocument();
  });

  it("moves a task to another lane through drag and drop", () => {
    const { onUpdateTask } = renderProjectsPage({
      items: [
        createTask({
          id: "task-1",
          title: "Backlog task",
        }),
      ],
    });

    const draggedTask = screen.getByLabelText("Task card Backlog task");
    const inProgressLane = screen.getByLabelText("In Progress lane");
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(() => "task-1"),
      effectAllowed: "",
      dropEffect: "",
    };

    fireEvent.dragStart(draggedTask, { dataTransfer });
    fireEvent.dragOver(inProgressLane, { dataTransfer });
    fireEvent.drop(inProgressLane, { dataTransfer });

    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      projectLaneId: "project-1-lane-in-progress",
    });
  });

  it("adds a custom lane to the selected project", () => {
    const { onUpdateProject } = renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: "Add lane" }));
    fireEvent.change(screen.getByLabelText("Lane name"), {
      target: { value: "Review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create lane" }));

    expect(onUpdateProject).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        boardLanes: expect.arrayContaining([
          expect.objectContaining({ name: "Review" }),
        ]),
      }),
    );
  });

  it("focuses the first lane by default and moves lane focus with keyboard motions", () => {
    renderProjectsPage({
      projects: [
        createProject({
          boardLanes: [
            { id: "project-1-lane-backlog", name: "Backlog", order: 0 },
            { id: "project-1-lane-doing", name: "Doing", order: 1 },
            { id: "project-1-lane-shipped", name: "Shipped", order: 2 },
          ],
        }),
      ],
    });

    const backlogLane = screen.getByLabelText("Backlog lane");
    const doingLane = screen.getByLabelText("Doing lane");
    const shippedLane = screen.getByLabelText("Shipped lane");

    expect(backlogLane).toHaveClass("is-focused");
    expect(backlogLane).toHaveAttribute("tabindex", "0");
    expect(doingLane).not.toHaveClass("is-focused");
    expect(shippedLane).not.toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "l" });
    expect(doingLane).toHaveClass("is-focused");
    expect(backlogLane).not.toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(shippedLane).toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "Tab" });
    expect(backlogLane).toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(shippedLane).toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "h" });
    expect(doingLane).toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(backlogLane).toHaveClass("is-focused");
  });

  it("shows the newest task first and moves focused task selection with j and k inside the focused lane", () => {
    renderProjectsPage({
      items: [
        createTask({
          id: "task-older",
          title: "Older task",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
        }),
        createTask({
          id: "task-newer",
          title: "Newer task",
          createdAt: "2026-03-18T00:00:00.000Z",
          updatedAt: "2026-03-18T00:00:00.000Z",
        }),
        createTask({
          id: "task-progress-1",
          title: "In progress first",
          projectLaneId: "project-1-lane-in-progress",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
        }),
        createTask({
          id: "task-progress-2",
          title: "In progress newest",
          projectLaneId: "project-1-lane-in-progress",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
        }),
      ],
    });

    const toDoLane = screen.getByLabelText("To Do lane");
    const toDoCards = within(toDoLane).getAllByLabelText(/Task card /);
    expect(toDoCards[0]).toHaveAttribute("aria-label", "Task card Newer task");
    expect(toDoCards[0]).toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByLabelText("Task card Older task")).toHaveClass("is-focused");
    expect(screen.getByLabelText("Task card Newer task")).not.toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getByLabelText("Task card Newer task")).toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "l" });
    expect(screen.getByLabelText("Task card In progress newest")).toHaveClass("is-focused");
    expect(screen.getByLabelText("Task card In progress first")).not.toHaveClass("is-focused");
  });

  it("opens the focused task card with Enter", () => {
    const { onSelectTask } = renderProjectsPage({
      items: [
        createTask({
          id: "task-older",
          title: "Older task",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
        }),
        createTask({
          id: "task-newer",
          title: "Newer task",
          createdAt: "2026-03-18T00:00:00.000Z",
          updatedAt: "2026-03-18T00:00:00.000Z",
        }),
      ],
    });

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onSelectTask).toHaveBeenCalledWith("task-newer");
  });

  it("does not move lane focus while the add-lane input is active", () => {
    renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: "Add lane" }));

    const laneNameInput = screen.getByLabelText("Lane name");
    fireEvent.keyDown(laneNameInput, { key: "l" });

    expect(screen.getByLabelText("To Do lane")).toHaveClass("is-focused");
    expect(screen.getByLabelText("In Progress lane")).not.toHaveClass("is-focused");
  });

  it("opens an inline task draft in the focused lane with n and submits it into that lane", () => {
    const { onCreateTask } = renderProjectsPage({
      projects: [
        createProject({
          boardLanes: [
            { id: "project-1-lane-backlog", name: "Backlog", order: 0 },
            { id: "project-1-lane-doing", name: "Doing", order: 1 },
            { id: "project-1-lane-shipped", name: "Shipped", order: 2 },
          ],
        }),
      ],
    });

    fireEvent.keyDown(window, { key: "l" });
    fireEvent.keyDown(window, { key: "n" });

    const draftInput = screen.getByRole("textbox", { name: "New task title" });
    expect(within(screen.getByLabelText("Doing lane")).getByRole("textbox", { name: "New task title" })).toBe(draftInput);

    fireEvent.change(draftInput, {
      target: { value: "Write inline board composer" },
    });
    fireEvent.keyDown(draftInput, { key: "Enter" });

    expect(onCreateTask).toHaveBeenCalledWith({
      title: "Write inline board composer",
      description: "",
      goalId: "",
      projectId: "project-1",
      projectLaneId: "project-1-lane-doing",
      openDetailOnSuccess: false,
    });
    expect(screen.queryByRole("textbox", { name: "New task title" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Doing lane")).toHaveClass("is-focused");
  });

  it("cancels the inline task draft with Escape", () => {
    renderProjectsPage();

    fireEvent.keyDown(window, { key: "n" });
    const draftInput = screen.getByRole("textbox", { name: "New task title" });

    fireEvent.keyDown(draftInput, { key: "Escape" });

    expect(screen.queryByRole("textbox", { name: "New task title" })).not.toBeInTheDocument();
  });
});
