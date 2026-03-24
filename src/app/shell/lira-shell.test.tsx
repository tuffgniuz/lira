import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/theme/theme-provider";
import { vaultPathStorageKey } from "@/app/navigation/navigation";
import { LiraShell } from "./lira-shell";
import type { WorkspaceItem } from "@/models/workspace-item";
import type { Project } from "@/models/project";
import { defaultProjectBoardLanes } from "@/models/project-board";
import type { Doc } from "@/models/doc";

const mocks = vi.hoisted(() => ({
  dialogOpen: vi.fn(),
  initializeVault: vi.fn(),
  loadWorkspaceItems: vi.fn(),
  replaceWorkspaceItems: vi.fn(),
  updateTask: vi.fn(),
  loadProjects: vi.fn(),
  saveProjects: vi.fn(),
  loadProfile: vi.fn(),
  saveProfile: vi.fn(),
  loadDocs: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.dialogOpen,
}));

vi.mock("@/services/vault", () => ({
  initializeVault: mocks.initializeVault,
}));

vi.mock("@/services/workspace", () => ({
  loadWorkspaceItems: mocks.loadWorkspaceItems,
  replaceWorkspaceItems: mocks.replaceWorkspaceItems,
}));

vi.mock("@/services/tasks", () => ({
  updateTask: mocks.updateTask,
}));

vi.mock("@/services/projects", () => ({
  loadProjects: mocks.loadProjects,
  saveProjects: mocks.saveProjects,
}));

vi.mock("@/services/profile", () => ({
  loadProfile: mocks.loadProfile,
  saveProfile: mocks.saveProfile,
}));

vi.mock("@/services/docs", () => ({
  loadDocs: mocks.loadDocs,
  createDoc: mocks.createDoc,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,
}));

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
  },
  getCM: vi.fn(() => ({
    state: { vim: { insertMode: true } },
    on: vi.fn(),
    off: vi.fn(),
  })),
  vim: vi.fn(() => ({ name: "vim-extension" })),
}));

function createWorkspaceItem(overrides: Partial<WorkspaceItem> = {}): WorkspaceItem {
  return {
    id: "item-1",
    kind: "task",
    state: "active",
    sourceType: "manual",
    title: "Review task palette",
    content: "",
    createdAt: "today",
    updatedAt: "today",
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

function renderShell() {
  return render(
    <ThemeProvider>
      <LiraShell />
    </ThemeProvider>,
  );
}

function createDoc(overrides: Partial<Doc> = {}): Doc {
  return {
    id: "doc-1",
    title: "Architecture notes",
    body: "Document the local-first persistence boundary.",
    projectId: "project-1",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
    ...overrides,
  };
}

function installLocalStorage(initialValues: Record<string, string> = {}) {
  const store = new Map(Object.entries(initialValues));

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
}

function pressSequence(sequence: string[]) {
  for (const key of sequence) {
    fireEvent.keyDown(window, { key });
  }
}

describe("LiraShell list shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installLocalStorage({
      [vaultPathStorageKey]: "/tmp/lira-test-vault",
    });

    const projects: Project[] = [
      {
        id: "project-1",
        name: "Lira",
        description: "Main app",
        hasKanbanBoard: true,
        boardLanes: defaultProjectBoardLanes("project-1"),
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
      },
    ];

    mocks.initializeVault.mockResolvedValue("/tmp/lira-test-vault");
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "capture-1",
        kind: "capture",
        sourceType: "capture",
        state: "inbox",
        title: "Sort inbox shortcuts",
        content: "Sort inbox shortcuts",
      }),
      createWorkspaceItem({
        id: "task-1",
        kind: "task",
        title: "Add list task shortcut",
      }),
      createWorkspaceItem({
        id: "goal-1",
        kind: "goal",
        title: "Ship goal command flow",
        goalMetric: undefined,
      }),
    ]);
    mocks.replaceWorkspaceItems.mockResolvedValue(undefined);
    mocks.updateTask.mockResolvedValue(undefined);
    mocks.loadProjects.mockResolvedValue(projects);
    mocks.saveProjects.mockResolvedValue(undefined);
    mocks.loadProfile.mockResolvedValue({
      name: "User",
      profilePicture: "",
    });
    mocks.saveProfile.mockResolvedValue(undefined);
    mocks.loadDocs.mockResolvedValue([]);
    mocks.createDoc.mockImplementation(async (_vaultPath: string, doc: Doc) => doc);
    mocks.updateDoc.mockImplementation(async (_vaultPath: string, doc: Doc) => doc);
    mocks.deleteDoc.mockResolvedValue(undefined);
  });

  it("opens list palettes for projects, tasks, goals, and inbox items from leader sequences", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    pressSequence([" ", "l", "p"]);
    expect(await screen.findByRole("textbox", { name: "Projects" })).toHaveAttribute(
      "placeholder",
      "list projects",
    );
    fireEvent.keyDown(window, { key: "Escape" });

    pressSequence([" ", "l", "t"]);
    expect(await screen.findByRole("textbox", { name: "Tasks" })).toHaveAttribute(
      "placeholder",
      "list tasks",
    );
    fireEvent.keyDown(window, { key: "Escape" });

    pressSequence([" ", "l", "g"]);
    expect(await screen.findByRole("textbox", { name: "Goals" })).toHaveAttribute(
      "placeholder",
      "list goals",
    );
    fireEvent.keyDown(window, { key: "Escape" });

    pressSequence([" ", "l", "i"]);
    expect(await screen.findByRole("textbox", { name: "Inbox" })).toHaveAttribute(
      "placeholder",
      "list inbox items",
    );
  });

  it("creates a doc from the leader new-doc sequence and opens its detail view", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadDocs).toHaveBeenCalled();
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    pressSequence([" ", "n", "d"]);

    fireEvent.change(await screen.findByRole("textbox", { name: "Doc title" }), {
      target: { value: "Architecture notes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.submit(screen.getByRole("textbox", { name: "Doc title" }).closest("form")!);

    await waitFor(() => {
      expect(mocks.createDoc).toHaveBeenCalledWith(
        "/tmp/lira-test-vault",
        expect.objectContaining({
          title: "Architecture notes",
          body: "",
          projectId: "project-1",
        }),
      );
    });

    expect(await screen.findByRole("heading", { name: "Architecture notes" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Doc body" })).toHaveValue("");
  });

  it("opens the docs list palette from leader list-docs and opens the selected doc", async () => {
    mocks.loadDocs.mockResolvedValue([
      createDoc(),
      createDoc({
        id: "doc-2",
        title: "Sprint notes",
        body: "Summarize the current sprint.",
        projectId: undefined,
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadDocs).toHaveBeenCalled();
    });

    pressSequence([" ", "l", "d"]);

    expect(await screen.findByRole("textbox", { name: "Docs" })).toHaveAttribute(
      "placeholder",
      "list docs",
    );
    expect(screen.getByText("Lira")).toBeInTheDocument();
    expect(screen.getByText("Standalone")).toBeInTheDocument();

    const linkedDocOption = screen.getByText("Architecture notes").closest('[role="option"]');
    if (!linkedDocOption) {
      throw new Error("Expected the linked doc option to be present in the command palette.");
    }
    expect(
      linkedDocOption.querySelector(
        'path[d="M7 3.5h7l4 4V20.5H7a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 7 3.5Z"]',
      ),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("option", { name: /Sprint notes/i }));

    expect(await screen.findByRole("heading", { name: "Sprint notes" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Doc body" })).toHaveValue(
      "Summarize the current sprint.",
    );
  });

  it("does not let project-board shortcuts steal leader new-item sequences", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    pressSequence([" ", "n", "p"]);

    expect(await screen.findByRole("dialog", { name: "New project" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "New task title" })).not.toBeInTheDocument();
  });

  it("dispatches project board move events for leader shift h and leader shift l", async () => {
    const moveHandler = vi.fn();
    window.addEventListener("lira:move-project-board-task", moveHandler as EventListener);

    try {
      renderShell();

      await waitFor(() => {
        expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
        expect(mocks.loadProjects).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole("button", { name: "Projects" }));
      expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: " " });
      fireEvent.keyDown(window, { key: "H", shiftKey: true });

      expect(moveHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { direction: "left" },
        }),
      );

      fireEvent.keyDown(window, { key: " " });
      fireEvent.keyDown(window, { key: "L", shiftKey: true });

      expect(moveHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { direction: "right" },
        }),
      );
    } finally {
      window.removeEventListener("lira:move-project-board-task", moveHandler as EventListener);
    }
  });

  it("lets focused project list rows use x to complete tasks", async () => {
    mocks.loadProjects.mockResolvedValue([
      {
        id: "project-1",
        name: "Lira",
        description: "Main app",
        hasKanbanBoard: false,
        boardLanes: [],
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
      },
    ]);
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "task-1",
        kind: "task",
        title: "Add list task shortcut",
        projectId: "project-1",
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    await screen.findByRole("row", { name: /Add list task shortcut/i });
    const taskTable = screen.getByRole("table", { name: "Project tasks" });
    await waitFor(() => {
      expect(taskTable).toHaveFocus();
    });

    fireEvent.keyDown(taskTable, { key: "x" });

    await waitFor(() => {
      expect(mocks.updateTask).toHaveBeenCalledWith(
        "/tmp/lira-test-vault",
        expect.objectContaining({
          id: "task-1",
          isCompleted: true,
        }),
      );
    });
  });

  it("keeps an empty vault empty instead of showing seeded example items", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([]);
    mocks.loadProjects.mockResolvedValue([]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));

    expect(await screen.findByText("No tasks match this view")).toBeInTheDocument();
    expect(screen.queryByText("Design the first task workspace layout")).not.toBeInTheDocument();
  });

  it("does not save workspace changes after the workspace load fails", async () => {
    mocks.loadWorkspaceItems.mockRejectedValueOnce(new Error("sqlite busy"));

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    pressSequence([" ", "n", "i"]);
    fireEvent.change(await screen.findByRole("textbox", { name: "Capture a thought" }), {
      target: { value: "Do not persist after a failed load" },
    });
    fireEvent.submit(screen.getByRole("textbox", { name: "Capture a thought" }).closest("form")!);

    expect(mocks.replaceWorkspaceItems).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Failed to save workspace changes: vault is not ready",
    );
  });

  it("does not save projects after the projects load fails", async () => {
    mocks.loadProjects.mockRejectedValueOnce(new Error("sqlite busy"));

    renderShell();

    await waitFor(() => {
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    pressSequence([" ", "n", "p"]);
    fireEvent.change(await screen.findByRole("textbox", { name: "Project name" }), {
      target: { value: "Should not save" },
    });
    fireEvent.submit(screen.getByRole("textbox", { name: "Project name" }).closest("form")!);

    expect(mocks.saveProjects).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Failed to save projects: vault is not ready",
    );
  });

  it("keeps project-scoped task goals automatic when creating tasks", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "goal-1",
        kind: "goal",
        title: "Complete 2 review tasks",
        goalTarget: 2,
        goalMetric: "tasks_completed",
        goalScope: { projectId: "project-1" },
      }),
      createWorkspaceItem({
        id: "task-1",
        kind: "task",
        title: "Review task 1",
        projectId: "project-1",
        isCompleted: true,
        completedAt: "2026-03-17",
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    pressSequence([" ", "n", "t"]);
    fireEvent.change(await screen.findByRole("textbox", { name: "Task title" }), {
      target: { value: "Review task 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete 2 review tasks" }));
    fireEvent.submit(screen.getByRole("textbox", { name: "Task title" }).closest("form")!);

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
      const latestCall = mocks.replaceWorkspaceItems.mock.calls[
        mocks.replaceWorkspaceItems.mock.calls.length - 1
      ];
      expect(latestCall?.[0]).toBe("/tmp/lira-test-vault");
      expect(latestCall?.[1]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "goal",
            id: "goal-1",
            goalScope: { projectId: "project-1" },
          }),
        ]),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "New task" })).not.toBeInTheDocument();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedGoal = latestSavedItems.find((item) => item.id === "goal-1");
    const savedTask = latestSavedItems.find(
      (item) => item.kind === "task" && item.title === "Review task 2",
    );

    expect(savedGoal?.goalScope).toEqual({ projectId: "project-1" });
    expect(savedTask).toEqual(
      expect.objectContaining({
        projectId: "project-1",
      }),
    );

    pressSequence([" ", "n", "t"]);
    fireEvent.change(await screen.findByRole("textbox", { name: "Task title" }), {
      target: { value: "Review task 3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    expect(screen.getByRole("button", { name: "Complete 2 review tasks" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("uses the current date when completing a task after midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    try {
      vi.setSystemTime(new Date("2026-03-17T12:00:00.000Z"));
      mocks.loadProjects.mockResolvedValue([
        {
          id: "project-1",
          name: "Lira",
          description: "Main app",
          hasKanbanBoard: false,
          boardLanes: [],
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
        },
      ]);
      mocks.loadWorkspaceItems.mockResolvedValue([
        createWorkspaceItem({
          id: "task-1",
          kind: "task",
          title: "Add list task shortcut",
          projectId: "project-1",
        }),
      ]);

      renderShell();

      await waitFor(() => {
        expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
        expect(mocks.loadProjects).toHaveBeenCalled();
      });

      vi.setSystemTime(new Date("2026-03-18T12:00:00.000Z"));

      fireEvent.click(screen.getByRole("button", { name: "Projects" }));
      expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

      await screen.findByRole("row", { name: /Add list task shortcut/i });
      const taskTable = screen.getByRole("table", { name: "Project tasks" });
      await waitFor(() => {
        expect(taskTable).toHaveFocus();
      });

      fireEvent.keyDown(taskTable, { key: "x" });

      await waitFor(() => {
        expect(mocks.updateTask).toHaveBeenCalledWith(
          "/tmp/lira-test-vault",
          expect.objectContaining({
            id: "task-1",
            isCompleted: true,
            completedAt: "2026-03-18",
          }),
        );
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes deleted tasks from linked goal scopes before saving workspace changes", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "goal-1",
        kind: "goal",
        title: "Complete review tasks",
        goalMetric: "tasks_completed",
        goalTarget: 2,
        goalPeriod: "daily",
        goalScope: { taskIds: ["task-1"] },
      }),
      createWorkspaceItem({
        id: "task-1",
        kind: "task",
        title: "Review task 1",
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Review task 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete task" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedGoal = latestSavedItems.find((item) => item.id === "goal-1");

    expect(savedGoal?.goalScope?.taskIds ?? []).toEqual([]);
    expect(latestSavedItems.some((item) => item.id === "task-1")).toBe(false);
  });

  it("applies project task template keys to new project tasks", async () => {
    mocks.loadProjects.mockResolvedValue([
      {
        id: "project-1",
        name: "Lira",
        description: "Main app",
        hasKanbanBoard: false,
        taskTemplate: {
          updatedAt: "2026-03-17T00:00:00.000Z",
          fields: [
            {
              id: "field-task-id",
              key: "task_id",
              label: "Task ID",
              type: "text",
            },
            {
              id: "field-stage-uuid",
              key: "stage_uuid",
              label: "Stage UUID",
              type: "text",
            },
          ],
        },
        boardLanes: [],
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
      },
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "n" });
    fireEvent.change(await screen.findByRole("textbox", { name: "New task title" }), {
      target: { value: "Template-backed task" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "New task title" }), { key: "Enter" });

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedTask = latestSavedItems.find(
      (item) => item.kind === "task" && item.title === "Template-backed task",
    );

    expect(savedTask).toEqual(
      expect.objectContaining({
        projectId: "project-1",
        customFieldValues: {
          task_id: "",
          stage_uuid: "",
        },
      }),
    );
  });

  it("updates an existing project task template and shows a success notification", async () => {
    mocks.loadProjects.mockResolvedValue([
      {
        id: "project-1",
        name: "Lira",
        description: "Main app",
        hasKanbanBoard: false,
        taskTemplate: {
          updatedAt: "2026-03-17T00:00:00.000Z",
          fields: [
            {
              id: "field-task-id",
              key: "task_id",
              label: "Task ID",
              type: "text",
            },
          ],
        },
        boardLanes: [],
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
      },
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit task template" }));
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Field label 2" }), {
      target: { value: "Stage UUID" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Field type 2" }), {
      target: { value: "boolean" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    await waitFor(() => {
      expect(mocks.saveProjects).toHaveBeenCalled();
    });

    const latestSavedProjects = mocks.saveProjects.mock.calls[
      mocks.saveProjects.mock.calls.length - 1
    ]?.[1] as Project[];

    expect(latestSavedProjects[0]?.taskTemplate).toEqual({
      updatedAt: expect.any(String),
      fields: [
        {
          id: "field-task-id",
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
    });
    expect(screen.getByRole("status")).toHaveTextContent("Task template updated.");
  });

  it("clears an existing project task template when the last field is removed", async () => {
    mocks.loadProjects.mockResolvedValue([
      {
        id: "project-1",
        name: "Lira",
        description: "Main app",
        hasKanbanBoard: false,
        taskTemplate: {
          updatedAt: "2026-03-17T00:00:00.000Z",
          fields: [
            {
              id: "field-task-id",
              key: "task_id",
              label: "Task ID",
              type: "text",
            },
          ],
        },
        boardLanes: [],
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
      },
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit task template" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    await waitFor(() => {
      expect(mocks.saveProjects).toHaveBeenCalled();
    });

    const latestSavedProjects = mocks.saveProjects.mock.calls[
      mocks.saveProjects.mock.calls.length - 1
    ]?.[1] as Project[];

    expect(latestSavedProjects[0]?.taskTemplate).toBeUndefined();
    expect(screen.getByRole("status")).toHaveTextContent("Task template removed.");
  });

  it("keeps the task template modal open and shows a failure notification when saving fails", async () => {
    mocks.loadProjects.mockResolvedValue([
      {
        id: "project-1",
        name: "Lira",
        description: "Main app",
        hasKanbanBoard: false,
        taskTemplate: {
          updatedAt: "2026-03-17T00:00:00.000Z",
          fields: [
            {
              id: "field-task-id",
              key: "task_id",
              label: "Task ID",
              type: "text",
            },
          ],
        },
        boardLanes: [],
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
      },
    ]);
    mocks.saveProjects.mockRejectedValueOnce(new Error("sqlite busy"));

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
      expect(mocks.loadProjects).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit task template" }));
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Field label 2" }), {
      target: { value: "Stage UUID" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Failed to save projects: sqlite busy",
      );
    });
    expect(screen.getByRole("dialog", { name: "Task template" })).toBeInTheDocument();
  });

  it("creates a project-board task in the focused lane and links it to the project", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    fireEvent.keyDown(window, { key: "l" });
    fireEvent.keyDown(window, { key: "n" });

    fireEvent.change(await screen.findByRole("textbox", { name: "New task title" }), {
      target: { value: "Create task from project board" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "New task title" }), { key: "Enter" });

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const inProgressLane = screen.getByLabelText("In Progress lane");
    await waitFor(() => {
      expect(
        within(inProgressLane).getAllByLabelText(/Task card /)[0],
      ).toHaveAttribute("aria-label", "Task card Create task from project board");
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedTask = latestSavedItems.find(
      (item) => item.kind === "task" && item.title === "Create task from project board",
    );

    expect(savedTask).toEqual(
      expect.objectContaining({
        state: "active",
        projectId: "project-1",
        projectLaneId: "project-1-lane-in-progress",
        isCompleted: false,
      }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Task card Create task from project board")).toHaveClass(
        "is-focused",
      );
    });
  });

  it("keeps project-scoped goals automatic when saving a task from the new task modal", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "goal-1",
        kind: "goal",
        title: "Complete 3 tasks each day",
        goalTarget: 3,
        goalMetric: "tasks_completed",
        goalPeriod: "daily",
        goalScope: { projectId: "project-1" },
      }),
      createWorkspaceItem({
        id: "task-0",
        kind: "task",
        title: "Existing task",
        projectId: "project-1",
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    pressSequence([" ", "n", "t"]);
    fireEvent.click(await screen.findByRole("button", { name: "Lira" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete 3 tasks each day" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Task title" }), {
      target: { value: "Review task #1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Task description" }), {
      target: { value: "sndjkas" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Task description" }), {
      key: "Enter",
    });

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedTask = latestSavedItems.find(
      (item) => item.kind === "task" && item.title === "Review task #1",
    );
    const savedGoal = latestSavedItems.find((item) => item.kind === "goal" && item.id === "goal-1");

    expect(savedTask).toEqual(
      expect.objectContaining({
        projectId: "project-1",
        title: "Review task #1",
        content: "sndjkas",
      }),
    );
    expect(savedGoal?.goalScope).toEqual({ projectId: "project-1" });
    expect(
      latestSavedItems.findIndex((item) => item.id === "task-0"),
    ).toBeLessThan(latestSavedItems.findIndex((item) => item.id === savedTask?.id));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "New task" })).not.toBeInTheDocument();
    });
  });

  it("opens a goal in edit mode and updates the existing goal", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "goal-1",
        kind: "goal",
        title: "Complete 3 tasks each day",
        goalTarget: 3,
        goalMetric: "tasks_completed",
        goalPeriod: "daily",
        goalScope: { projectId: "project-1" },
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Goals" }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit Complete 3 tasks each day" }));

    expect(await screen.findByRole("heading", { name: "Edit Goal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Goal sentence")).toHaveValue("Complete 3 tasks each day");

    fireEvent.change(screen.getByLabelText("Goal sentence"), {
      target: { value: "Complete 5 tasks each day" },
    });
    fireEvent.change(screen.getByLabelText("Goal target"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    expect(latestSavedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "goal-1",
          title: "Complete 5 tasks each day",
          goalTarget: 5,
          goalMetric: "tasks_completed",
          goalPeriod: "daily",
        }),
      ]),
    );
  });

  it("shows a persistence error toast when saving workspace items fails", async () => {
    mocks.replaceWorkspaceItems.mockImplementation(async (_vaultPath, items: WorkspaceItem[]) => {
      if (items.some((item) => item.kind === "goal" && item.title === "Complete 5 tasks today")) {
        throw new Error("sqlite busy");
      }
    });

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Goals" }));
    pressSequence([" ", "n", "g"]);
    const dialog = await screen.findByRole("dialog", { name: "New Goal" });
    fireEvent.change(within(dialog).getByLabelText("Goal sentence"), {
      target: { value: "Complete 5 tasks today" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Daily" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Tasks" }));
    fireEvent.change(within(dialog).getByLabelText("Goal target"), {
      target: { value: "5" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Failed to save workspace changes: sqlite busy",
    );
    expect(screen.queryByText("Complete 5 tasks today")).not.toBeInTheDocument();
  });

  it("saves quick captures with real ISO timestamps instead of placeholder copy", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    pressSequence([" ", "n", "i"]);
    fireEvent.change(await screen.findByRole("textbox", { name: "Capture a thought" }), {
      target: { value: "Capture a real timestamp" },
    });
    fireEvent.submit(screen.getByRole("textbox", { name: "Capture a thought" }).closest("form")!);

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedCapture = latestSavedItems.find(
      (item) => item.kind === "capture" && item.title === "Capture a real timestamp",
    );

    expect(savedCapture?.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(savedCapture?.updatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("converts a capture into a linked task while preserving the capture record", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "capture-1",
        kind: "capture",
        sourceType: "capture",
        state: "inbox",
        title: "Build a browser",
        content: "Build a browser",
        projectId: "project-1",
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Capture Inbox" }));
    fireEvent.click(
      within(await screen.findByLabelText("Inbox item actions")).getByRole("button", {
        name: "Task",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedCapture = latestSavedItems.find((item) => item.id === "capture-1");
    const savedTask = latestSavedItems.find(
      (item) => item.kind === "task" && item.sourceCaptureId === "capture-1",
    );

    expect(savedCapture).toEqual(
      expect.objectContaining({
        id: "capture-1",
        kind: "capture",
        state: "active",
      }),
    );
    expect(savedTask).toEqual(
      expect.objectContaining({
        title: "Build a browser",
        content: "Build a browser",
        projectId: "project-1",
        sourceType: "capture",
      }),
    );
  });

  it("lets capture conversion assign the new task to a different project", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "capture-1",
        kind: "capture",
        sourceType: "capture",
        state: "inbox",
        title: "Build a browser",
        content: "Build a browser",
        projectId: "",
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Capture Inbox" }));
    fireEvent.click(
      within(await screen.findByLabelText("Inbox item actions")).getByRole("button", {
        name: "Task",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mocks.replaceWorkspaceItems).toHaveBeenCalled();
    });

    const latestSavedItems = mocks.replaceWorkspaceItems.mock.calls[
      mocks.replaceWorkspaceItems.mock.calls.length - 1
    ]?.[1] as WorkspaceItem[];
    const savedTask = latestSavedItems.find(
      (item) => item.kind === "task" && item.sourceCaptureId === "capture-1",
    );

    expect(savedTask).toEqual(
      expect.objectContaining({
        title: "Build a browser",
        projectId: "project-1",
        project: "Lira",
      }),
    );
  });

  it("opens a task as a dedicated detail page instead of showing the list beside it", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));

    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Task" })).not.toBeInTheDocument();
  });

  it("leaves task detail when editor-like typing targets receive ctrl+z z", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    const editorSurface = document.createElement("div");
    editorSurface.contentEditable = "true";
    editorSurface.dataset.vimMode = "insert";
    document.body.appendChild(editorSurface);

    fireEvent.keyDown(editorSurface, { key: "z", ctrlKey: true });
    fireEvent.keyDown(editorSurface, { key: "z" });

    expect(screen.queryByRole("heading", { name: "Add list task shortcut" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();

    editorSurface.remove();
  });

  it("keeps task detail open when Escape is pressed from a vim editor in normal mode", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    const editorSurface = document.createElement("div");
    editorSurface.contentEditable = "true";
    editorSurface.dataset.vimMode = "normal";
    document.body.appendChild(editorSurface);

    fireEvent.keyDown(editorSurface, { key: "Escape" });

    expect(screen.getByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Task" })).not.toBeInTheDocument();

    editorSurface.remove();
  });

  it("keeps task typing local and persists through the task service after a debounce", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    vi.useFakeTimers();

    try {
      const editor = screen.getByRole("textbox", { name: "Task description" });
      fireEvent.change(editor, { target: { value: "A" } });
      fireEvent.change(editor, { target: { value: "AB" } });

      expect(screen.getByRole("textbox", { name: "Task description" })).toHaveValue("AB");
      expect(mocks.replaceWorkspaceItems).not.toHaveBeenCalled();
      expect(mocks.updateTask).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      expect(mocks.updateTask).toHaveBeenCalledWith(
        "/tmp/lira-test-vault",
        expect.objectContaining({
          id: "task-1",
          description: "AB",
        }),
      );
      expect(mocks.replaceWorkspaceItems).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reverts task description edits when the task service save fails", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    mocks.updateTask.mockRejectedValueOnce(new Error("sqlite busy"));
    vi.useFakeTimers();

    try {
      const editor = screen.getByRole("textbox", { name: "Task description" });
      fireEvent.change(editor, { target: { value: "AB" } });

      expect(editor).toHaveValue("AB");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      vi.useRealTimers();

      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: "Task description" })).toHaveValue("");
      });
      expect(screen.getByRole("status")).toHaveTextContent("Failed to save task: sqlite busy");
    } finally {
      vi.useRealTimers();
    }
  });

  it("navigates backward and forward through visited pages with Shift+H and Shift+L", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Capture Inbox" }));
    expect(screen.getByRole("button", { name: "Capture Inbox" })).toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Goals" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Goals" })).toHaveClass("is-active");
    });

    fireEvent.keyDown(window, { key: "H", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Capture Inbox" })).toHaveClass("is-active");
    });

    fireEvent.keyDown(window, { key: "L", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Goals" })).toHaveClass("is-active");
    });
  });

  it("clears forward page history after navigating somewhere new", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Capture Inbox" }));
    fireEvent.click(screen.getByRole("button", { name: "Goals" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Goals" })).toHaveClass("is-active");
    });

    fireEvent.keyDown(window, { key: "H", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Capture Inbox" })).toHaveClass("is-active");
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tasks" })).toHaveClass("is-active");
    });

    fireEvent.keyDown(window, { key: "L", shiftKey: true });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tasks" })).toHaveClass("is-active");
    });
  });

  it("reopens the task detail page when moving forward from the task list", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "H", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Back to tasks" })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "L", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();
    });
  });

  it("walks backward and forward across page and task detail history", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Capture Inbox" }));
    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "H", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "H", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Capture Inbox" })).toHaveClass("is-active");
    });

    fireEvent.keyDown(window, { key: "L", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tasks" })).toHaveClass("is-active");
      expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "L", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();
    });
  });

  it("opens project-board tasks into the shared detail page and returns to the board", async () => {
    mocks.loadWorkspaceItems.mockResolvedValue([
      createWorkspaceItem({
        id: "task-1",
        kind: "task",
        title: "Add list task shortcut",
        projectId: "project-1",
        createdAt: "2026-03-18T00:00:00.000Z",
        updatedAt: "2026-03-18T00:00:00.000Z",
      }),
    ]);

    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Lira" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter" });

    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Projects" })).toHaveClass("is-active");
  });

  it("ignores Shift+H and Shift+L when focus is inside an editor-like typing target", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    const editorSurface = document.createElement("div");
    editorSurface.setAttribute("contenteditable", "true");
    document.body.appendChild(editorSurface);
    editorSurface.focus();

    fireEvent.keyDown(editorSurface, { key: "L", shiftKey: true });
    fireEvent.keyDown(editorSurface, { key: "H", shiftKey: true });

    expect(screen.getByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    editorSurface.remove();
  });

  it("allows Shift+H and Shift+L from editor-like targets when vim is in normal mode", async () => {
    renderShell();

    await waitFor(() => {
      expect(mocks.loadWorkspaceItems).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Capture Inbox" }));
    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add list task shortcut" }));
    expect(await screen.findByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();

    const editorSurface = document.createElement("div");
    editorSurface.contentEditable = "true";
    editorSurface.dataset.vimMode = "normal";
    document.body.appendChild(editorSurface);

    fireEvent.keyDown(editorSurface, { key: "H", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    });

    fireEvent.keyDown(editorSurface, { key: "H", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Capture Inbox" })).toHaveClass("is-active");
    });

    fireEvent.keyDown(editorSurface, { key: "L", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tasks" })).toHaveClass("is-active");
      expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    });

    fireEvent.keyDown(editorSurface, { key: "L", shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Add list task shortcut" })).toBeInTheDocument();
    });

    editorSurface.remove();
  });
});
