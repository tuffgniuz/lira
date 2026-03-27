import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsPage } from "./projects-page";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";

vi.mock("@uiw/react-codemirror", () => ({
  default: ({
    value,
    onChange,
    "aria-label": ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    "aria-label": string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("@replit/codemirror-vim", () => ({
  Vim: {
    defineEx: vi.fn(),
    map: vi.fn(),
    handleKey: vi.fn(),
  },
  getCM: vi.fn(() => ({
    state: { vim: { insertMode: true } },
    on: vi.fn(),
    off: vi.fn(),
  })),
  vim: vi.fn(() => ({ name: "vim-extension" })),
}));

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Lira",
    description: "Build the workflow shell.",
    hasKanbanBoard: true,
    taskTemplate: undefined,
    boardLanes: [
      { id: "project-1-lane-to-do", name: "To Do", order: 0 },
      { id: "project-1-lane-in-progress", name: "In Progress", order: 1 },
      { id: "project-1-lane-done", name: "Done", order: 2 },
    ],
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
    ...overrides,
  } as Project;
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
    customFieldValues: {},
    ...overrides,
  };
}

function renderProjectsPage({
  projects = [createProject()],
  items = [],
  todayDate = "2026-03-20",
}: {
  projects?: Project[];
  items?: Item[];
  todayDate?: string;
} = {}) {
  const onUpdateProject = vi.fn();
  const onUpdateTask = vi.fn();
  const onDeleteTask = vi.fn();
  const onNotify = vi.fn();
  const onCreateTask = vi.fn(() => "task-created");
  const onSelectTask = vi.fn();

  render(
    <ProjectsPage
      projects={projects}
      items={items}
      todayDate={todayDate}
      rightRailMode="auto"
      selectedProjectId="project-1"
      onUpdateProject={onUpdateProject}
      onUpdateTask={onUpdateTask}
      onDeleteTask={onDeleteTask}
      onNotify={onNotify}
      onCreateTask={onCreateTask}
      onSelectTask={onSelectTask}
    />,
  );

  return {
    onUpdateProject,
    onUpdateTask,
    onDeleteTask,
    onNotify,
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
        createTask({
          id: "goal-1",
          kind: "goal",
          title: "Complete 3 tasks",
          goalMetric: "tasks_completed",
          goalTarget: 3,
          goalPeriod: "daily",
          projectId: "project-1",
          project: "Lira",
        }),
      ],
    });

    expect(screen.getByRole("heading", { name: "Lira" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show project detail in three-column layout" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Projects list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable kanban board" })).not.toBeInTheDocument();

    const toDoLane = screen.getByLabelText("To Do lane");
    const inProgressLane = screen.getByLabelText("In Progress lane");
    const doneLane = screen.getByLabelText("Done lane");

    expect(within(toDoLane).getByText("Backlog task")).toBeInTheDocument();
    expect(within(inProgressLane).getByText("Active task")).toBeInTheDocument();
    expect(within(doneLane).queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByText("Other project task")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Goals" })).toBeInTheDocument();
    expect(screen.getAllByText("Complete 3 tasks").length).toBeGreaterThan(0);
  });

  it("opens the task template modal with Shift+T on the projects page", () => {
    renderProjectsPage();

    fireEvent.keyDown(window, { key: "T", shiftKey: true });

    expect(screen.getByRole("dialog", { name: "Task template" })).toBeInTheDocument();
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

  it("shows a completion checkmark on completed kanban cards", () => {
    renderProjectsPage({
      items: [
        createTask({
          id: "task-done",
          title: "Done task",
          isCompleted: true,
          projectLaneId: "project-1-lane-done",
        }),
      ],
    });

    const taskCard = screen.getByLabelText("Task card Done task");

    expect(within(taskCard).getByLabelText("Completed task")).toBeInTheDocument();
  });

  it("does not render task descriptions inside kanban lane cards", () => {
    renderProjectsPage({
      items: [
        createTask({
          id: "task-with-description",
          title: "Task with notes",
          content: "This description should stay out of the lane card.",
        }),
      ],
    });

    const taskCard = screen.getByLabelText("Task card Task with notes");

    expect(within(taskCard).getByText("Task with notes")).toBeInTheDocument();
    expect(
      within(taskCard).queryByText("This description should stay out of the lane card."),
    ).not.toBeInTheDocument();
  });

  it("renders a simple task list when the selected project has no kanban board", () => {
    renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
      items: [
        createTask({
          id: "task-1",
          title: "Newest task",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
          isCompleted: false,
        }),
        createTask({
          id: "task-2",
          title: "Older task",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
          dueDate: "2026-03-25",
          priority: "high",
          isCompleted: true,
        }),
      ],
    });

    expect(screen.getByRole("heading", { name: "Lira" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Project tasks" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Lira board")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add lane" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enable kanban board" })).not.toBeInTheDocument();
    expect(screen.getAllByText("None")).toHaveLength(2);

    const filters = screen.getByLabelText("Project task filters");
    expect(within(within(filters).getByRole("button", { name: "To do" })).getByText("1")).toBeInTheDocument();
    expect(within(within(filters).getByRole("button", { name: "Completed" })).getByText("1")).toBeInTheDocument();
    expect(within(within(filters).getByRole("button", { name: "All" })).getByText("2")).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Newest task")).toBeInTheDocument();
    expect(within(rows[1]).getAllByText("None")).toHaveLength(2);
    expect(screen.queryByText("Older task")).not.toBeInTheDocument();
  });

  it("creates a project task template from the project page", () => {
    const { onUpdateProject } = renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Create task template" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Field label 1" }), {
      target: { value: "Task ID" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Field type 1" }), {
      target: { value: "text" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Field label 2" }), {
      target: { value: "Stage UUID" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Field type 2" }), {
      target: { value: "boolean" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Default task description template" }), {
      target: { value: "1. step 1\n2. step 2\n3. etc" },
    });

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Field type 2" }), { key: "Enter" });

    expect(onUpdateProject).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        taskTemplate: {
          updatedAt: expect.any(String),
          descriptionTemplate: "1. step 1\n2. step 2\n3. etc",
          fields: [
            {
              id: expect.any(String),
              key: "task_id",
              label: "Task ID",
              type: "text",
            },
            {
              id: expect.any(String),
              key: "stage_uuid",
              label: "Stage UUID",
              type: "boolean",
            },
          ],
        },
      }),
    );
  });

  it("renders a vim editor for the default task description template", () => {
    renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Create task template" }));

    expect(
      screen.getByRole("textbox", { name: "Default task description template" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Default task description")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Editor status")).not.toBeInTheDocument();
  });

  it("auto-generates field keys from labels without showing a key field", () => {
    const { onUpdateProject } = renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Create task template" }));

    const labelInput = screen.getByRole("textbox", { name: "Field label 1" });

    fireEvent.change(labelInput, { target: { value: "Cheese" } });
    fireEvent.change(labelInput, { target: { value: "Task ID" } });
    expect(screen.queryByRole("textbox", { name: "Field key 1" })).not.toBeInTheDocument();

    fireEvent.keyDown(labelInput, { key: "Enter" });

    expect(onUpdateProject).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        taskTemplate: expect.objectContaining({
          fields: [
            expect.objectContaining({
              key: "task_id",
              label: "Task ID",
            }),
          ],
        }),
      }),
    );
  });

  it("renders the task template editor with compact column headers", () => {
    renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Create task template" }));

    expect(
      screen.queryByText("Add project-specific fields for tasks in this project."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Key is generated from the label by default.")).not.toBeInTheDocument();
    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Task ID")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("task_id")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("project-task-template-panel");
  });

  it("focuses the newly added template field row when adding fields with the button", () => {
    renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Create task template" }));

    const firstLabelInput = screen.getByRole("textbox", { name: "Field label 1" });
    fireEvent.change(firstLabelInput, { target: { value: "Task ID" } });

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(screen.getByRole("textbox", { name: "Field label 2" })).toHaveFocus();
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByRole("textbox", { name: "Field label 2" })).toHaveFocus();

    fireEvent.change(screen.getByRole("textbox", { name: "Field label 2" }), {
      target: { value: "Stage UUID" },
    });

    expect(screen.getByRole("textbox", { name: "Field label 1" })).toHaveValue("Task ID");
    expect(screen.getByRole("textbox", { name: "Field label 2" })).toHaveValue("Stage UUID");

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(screen.getByRole("textbox", { name: "Field label 3" })).toHaveFocus();
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByRole("textbox", { name: "Field label 3" })).toHaveFocus();
  });

  it("keeps focus on the active template row while typing after adding fields", () => {
    renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Create task template" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Field label 1" }), {
      target: { value: "Task ID" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add field" }));

    const secondLabelInput = screen.getByRole("textbox", { name: "Field label 2" });
    fireEvent.change(secondLabelInput, {
      target: { value: "Stage UUID" },
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(secondLabelInput).toHaveFocus();
    expect(secondLabelInput).toHaveValue("Stage UUID");
    expect(screen.getByRole("textbox", { name: "Field label 1" })).toHaveValue("Task ID");
  });

  it("supports keyboard-driven template modal navigation and saving", () => {
    const { onUpdateProject } = renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Create task template" }));

    const labelInput = screen.getByRole("textbox", { name: "Field label 1" });
    labelInput.focus();
    fireEvent.change(labelInput, { target: { value: "Task ID" } });

    const typeSelect = screen.getByRole("combobox", { name: "Field type 1" });
    fireEvent.change(typeSelect, { target: { value: "number" } });

    fireEvent.keyDown(typeSelect, { key: "n", altKey: true });
    expect(screen.getByRole("textbox", { name: "Field label 2" })).toHaveFocus();

    fireEvent.change(screen.getByRole("textbox", { name: "Field label 2" }), {
      target: { value: "Estimate" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Field type 2" }), {
      target: { value: "date" },
    });

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Field type 2" }), {
      key: "Enter",
    });

    expect(onUpdateProject).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        taskTemplate: {
          descriptionTemplate: "",
          updatedAt: expect.any(String),
          fields: [
            expect.objectContaining({
              key: "task_id",
              label: "Task ID",
              type: "number",
            }),
            expect.objectContaining({
              key: "estimate",
              label: "Estimate",
              type: "date",
            }),
          ],
        },
      }),
    );
  });

  it("switches project list filters with buttons and 1 2 3 shortcuts", () => {
    renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
      items: [
        createTask({
          id: "task-open",
          title: "Open task",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
          isCompleted: false,
        }),
        createTask({
          id: "task-done",
          title: "Completed task",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
          isCompleted: true,
        }),
      ],
    });

    const filters = screen.getByLabelText("Project task filters");

    expect(within(filters).getByRole("button", { name: "To do" })).toHaveClass("is-active");
    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.queryByText("Completed task")).not.toBeInTheDocument();

    fireEvent.click(within(filters).getByRole("button", { name: "Completed" }));
    expect(within(filters).getByRole("button", { name: "Completed" })).toHaveClass("is-active");
    expect(screen.getByText("Completed task")).toBeInTheDocument();
    expect(screen.queryByText("Open task")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "3" });
    expect(within(filters).getByRole("button", { name: "All" })).toHaveClass("is-active");
    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.getByText("Completed task")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "1" });
    expect(within(filters).getByRole("button", { name: "To do" })).toHaveClass("is-active");
    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.queryByText("Completed task")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "2" });
    expect(within(filters).getByRole("button", { name: "Completed" })).toHaveClass("is-active");
    expect(screen.getByText("Completed task")).toBeInTheDocument();
    expect(screen.queryByText("Open task")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation and completion toggling in list mode", () => {
    const { onSelectTask, onUpdateTask } = renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
      items: [
        createTask({
          id: "task-newer",
          title: "Newer task",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
        }),
        createTask({
          id: "task-older",
          title: "Older task",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
        }),
      ],
    });

    expect(screen.getByRole("row", { name: /Newer task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByRole("row", { name: /Older task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByRole("row", { name: /Newer task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "x" });
    expect(onUpdateTask).toHaveBeenCalledWith("task-newer", { isCompleted: true });

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSelectTask).toHaveBeenCalledWith("task-newer");
  });

  it("creates list tasks with n and without assigning a board lane", () => {
    const { onCreateTask } = renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    fireEvent.keyDown(window, { key: "n" });

    const draftInput = screen.getByRole("textbox", { name: "New task title" });
    fireEvent.change(draftInput, {
      target: { value: "Write project list mode" },
    });
    fireEvent.keyDown(draftInput, { key: "Enter" });

    expect(onCreateTask).toHaveBeenCalledWith({
      title: "Write project list mode",
      description: "",
      goalId: "",
      projectId: "project-1",
      openDetailOnSuccess: false,
    });
  });

  it("opens delete confirmation with d d in project list mode", () => {
    const { onDeleteTask } = renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
      items: [
        createTask({
          id: "task-newer",
          title: "Newer task",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
        }),
        createTask({
          id: "task-older",
          title: "Older task",
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
        }),
      ],
    });

    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "d" });
    fireEvent.keyDown(window, { key: "d" });

    expect(screen.getByText("Delete task")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDeleteTask).toHaveBeenCalledWith("task-older");
  });

  it("does not render kanban toggle controls on the project page", () => {
    renderProjectsPage({
      projects: [
        createProject({
          hasKanbanBoard: false,
          boardLanes: [],
        } as Partial<Project>),
      ],
    });

    expect(screen.queryByRole("button", { name: "Enable kanban board" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable kanban board" })).not.toBeInTheDocument();
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

  it.skip("adds a custom lane to the selected project", () => {
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

    fireEvent.keyDown(window, { key: "h" });
    expect(shippedLane).toHaveClass("is-focused");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(doingLane).toHaveClass("is-focused");
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

  it("moves the focused task card to the lane on the right from the leader chord", () => {
    const { onUpdateTask } = renderProjectsPage({
      items: [
        createTask({
          id: "task-newer",
          title: "Newer task",
          createdAt: "2026-03-18T00:00:00.000Z",
          updatedAt: "2026-03-18T00:00:00.000Z",
        }),
      ],
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("lira:move-project-board-task", { detail: { direction: "right" } }),
      );
    });

    expect(onUpdateTask).toHaveBeenCalledWith("task-newer", {
      projectLaneId: "project-1-lane-in-progress",
    });
  });

  it("marks a task complete when the focused card moves into the done lane", () => {
    const { onUpdateTask } = renderProjectsPage({
      items: [
        createTask({
          id: "task-progress-2",
          title: "In progress newest",
          projectLaneId: "project-1-lane-in-progress",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
        }),
      ],
    });

    fireEvent.keyDown(window, { key: "l" });
    expect(screen.getByLabelText("Task card In progress newest")).toHaveClass("is-focused");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("lira:move-project-board-task", { detail: { direction: "right" } }),
      );
    });

    expect(onUpdateTask).toHaveBeenCalledWith("task-progress-2", {
      projectLaneId: "project-1-lane-done",
      isCompleted: true,
    });
  });

  it("moves the focused task card to the lane on the left from the leader chord", () => {
    const { onUpdateTask } = renderProjectsPage({
      items: [
        createTask({
          id: "task-progress-2",
          title: "In progress newest",
          projectLaneId: "project-1-lane-in-progress",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z",
        }),
      ],
    });

    fireEvent.keyDown(window, { key: "l" });
    expect(screen.getByLabelText("Task card In progress newest")).toHaveClass("is-focused");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("lira:move-project-board-task", { detail: { direction: "left" } }),
      );
    });

    expect(onUpdateTask).toHaveBeenCalledWith("task-progress-2", {
      projectLaneId: "project-1-lane-to-do",
    });
  });

  it("lifts the focused task card while the board move chord is active and lowers it on release", () => {
    renderProjectsPage({
      items: [
        createTask({
          id: "task-newer",
          title: "Newer task",
          createdAt: "2026-03-18T00:00:00.000Z",
          updatedAt: "2026-03-18T00:00:00.000Z",
        }),
      ],
    });

    expect(screen.getByLabelText("Task card Newer task")).toHaveClass("is-focused");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("lira:project-board-lift", { detail: { active: true } }),
      );
    });

    expect(screen.getByLabelText("Task card Newer task")).toHaveClass("is-lifted");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("lira:project-board-lift", { detail: { active: false } }),
      );
    });

    expect(screen.getByLabelText("Task card Newer task")).not.toHaveClass("is-lifted");
  });

  it.skip("does not move lane focus while the add-lane input is active", () => {
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
