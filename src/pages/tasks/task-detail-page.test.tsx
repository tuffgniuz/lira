import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";
import { defaultProjectBoardLanes } from "@/models/project-board";

const vimMocks = vi.hoisted(() => ({
  defineEx: vi.fn(),
  map: vi.fn(),
  handleKey: vi.fn(),
  editorFocus: vi.fn(),
  editorDom: document.createElement("div"),
  delayEditorCreation: false,
  vim: vi.fn(() => ({ name: "vim-extension" })),
}));

vi.mock("@uiw/react-codemirror", () => ({
  default: (props: {
    value: string;
    onChange: (value: string) => void;
    "aria-label": string;
    onCreateEditor?: (view: { focus: () => void; dom: HTMLElement }) => void;
  }) => {
    React.useEffect(() => {
      const view = {
        focus: vimMocks.editorFocus,
        dom: vimMocks.editorDom,
      };

      if (vimMocks.delayEditorCreation) {
        const timeoutId = window.setTimeout(() => {
          props.onCreateEditor?.(view);
        }, 0);

        return () => window.clearTimeout(timeoutId);
      }

      props.onCreateEditor?.(view);
    }, [props]);

    return (
      <textarea
        aria-label={props["aria-label"]}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    );
  },
}));

vi.mock("@replit/codemirror-vim", () => ({
  Vim: {
    defineEx: vimMocks.defineEx,
    map: vimMocks.map,
    handleKey: vimMocks.handleKey,
  },
  getCM: vi.fn(() => ({
    state: { vim: { insertMode: false } },
    on: vi.fn(),
    off: vi.fn(),
  })),
  vim: vimMocks.vim,
}));

import { TaskDetailPage } from "./task-detail-page";

function createTask(overrides: Partial<Item> = {}): Item {
  return {
    id: "task-1",
    kind: "task",
    state: "active",
    sourceType: "manual",
    title: "Build task detail page",
    content: "Draft a calmer full-page task editor.",
    createdAt: "2026-03-21T00:00:00.000Z",
    updatedAt: "2026-03-21T00:00:00.000Z",
    tags: [],
    projectId: "project-1",
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

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Lira",
    description: "",
    hasKanbanBoard: true,
    boardLanes: defaultProjectBoardLanes("project-1"),
    taskTemplate: undefined,
    createdAt: "2026-03-21T00:00:00.000Z",
    updatedAt: "2026-03-21T00:00:00.000Z",
    ...overrides,
  };
}

function renderTaskDetailPage(
  props: Partial<ComponentProps<typeof TaskDetailPage>> = {},
) {
  const onBack = vi.fn();
  const onUpdateTask = vi.fn();
  const onDeleteTask = vi.fn();
  const onNotify = vi.fn();

  render(
    <TaskDetailPage
      task={createTask()}
      projects={[createProject()]}
      onBack={onBack}
      onUpdateTask={onUpdateTask}
      onDeleteTask={onDeleteTask}
      onNotify={onNotify}
      {...props}
    />,
  );

  return { onBack, onUpdateTask, onDeleteTask, onNotify };
}

describe("TaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vimMocks.editorDom = document.createElement("div");
    vimMocks.delayEditorCreation = false;
  });

  it("renders a centered full-page task detail layout and updates task content", () => {
    vi.useFakeTimers();

    const { onUpdateTask } = renderTaskDetailPage();

    try {
      const heading = screen.getByRole("heading", { name: "Build task detail page" });
      expect(heading).toBeInTheDocument();
      expect(heading.closest(".task-detail-page__content")).not.toBeNull();
      expect(screen.getByText("Open • Lira • CREATED YESTERDAY")).toBeInTheDocument();

      fireEvent.change(screen.getByRole("textbox", { name: "Task description" }), {
        target: { value: "Ship the dedicated detail page." },
      });

      expect(onUpdateTask).not.toHaveBeenCalled();

      vi.advanceTimersByTime(350);
      expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
        content: "Ship the dedicated detail page.",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps vim enabled for the editor without installing panel-specific key remaps", () => {
    renderTaskDetailPage();

    expect(screen.getByRole("textbox", { name: "Task description" })).toBeInTheDocument();
    expect(vimMocks.defineEx).not.toHaveBeenCalled();
    expect(vimMocks.map).not.toHaveBeenCalled();
  });

  it("focuses the editor and enters vim insert mode when the page opens", () => {
    renderTaskDetailPage();

    expect(vimMocks.editorFocus).toHaveBeenCalled();
    expect(vimMocks.handleKey).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { vim: { insertMode: false } },
      }),
      "i",
    );
  });

  it("focuses the editor and enters vim insert mode when codemirror finishes mounting later", () => {
    vi.useFakeTimers();
    vimMocks.delayEditorCreation = true;

    try {
      renderTaskDetailPage();

      expect(vimMocks.editorFocus).not.toHaveBeenCalled();

      vi.runAllTimers();

      expect(vimMocks.editorFocus).toHaveBeenCalled();
      expect(vimMocks.handleKey).toHaveBeenCalledWith(
        expect.objectContaining({
          state: { vim: { insertMode: false } },
        }),
        "i",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens a delete confirmation before removing the task", () => {
    const { onDeleteTask } = renderTaskDetailPage();

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDeleteTask).toHaveBeenCalledWith("task-1");
  });

  it("renders project template fields and updates custom task values", () => {
    const { onUpdateTask } = renderTaskDetailPage({
      task: createTask({
        customFieldValues: {
          task_id: "TASK-41",
        },
      }),
      projects: [
        createProject({
          taskTemplate: {
            updatedAt: "2026-03-21T00:00:00.000Z",
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
        }),
      ],
    });

    expect(screen.getByLabelText("Project fields")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Task ID" })).toHaveValue("TASK-41");
    expect(screen.getByRole("textbox", { name: "Stage UUID" })).toHaveValue("");

    fireEvent.change(screen.getByRole("textbox", { name: "Stage UUID" }), {
      target: { value: "stage-abc-123" },
    });

    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      customFieldValues: {
        task_id: "TASK-41",
        stage_uuid: "stage-abc-123",
      },
    });
  });

  it("renders non-text project fields with matching control types", () => {
    const { onUpdateTask } = renderTaskDetailPage({
      task: createTask({
        customFieldValues: {
          stage_ready: "true",
          estimate_points: "8",
          review_date: "2026-03-28",
        },
      }),
      projects: [
        createProject({
          taskTemplate: {
            updatedAt: "2026-03-21T00:00:00.000Z",
            fields: [
              {
                id: "field-stage-ready",
                key: "stage_ready",
                label: "Stage Ready",
                type: "boolean",
              },
              {
                id: "field-estimate-points",
                key: "estimate_points",
                label: "Estimate Points",
                type: "number",
              },
              {
                id: "field-review-date",
                key: "review_date",
                label: "Review Date",
                type: "date",
              },
            ],
          },
        }),
      ],
    });

    expect(screen.getByRole("checkbox", { name: "Stage Ready" })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Estimate Points" })).toHaveValue(8);
    expect(screen.getByLabelText("Review Date")).toHaveValue("2026-03-28");

    fireEvent.click(screen.getByRole("checkbox", { name: "Stage Ready" }));

    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      customFieldValues: {
        stage_ready: "false",
        estimate_points: "8",
        review_date: "2026-03-28",
      },
    });
  });

  it("keeps the latest local draft when the parent rerenders with stale task content", () => {
    const onBack = vi.fn();
    const onUpdateTask = vi.fn();
    const onDeleteTask = vi.fn();

    const view = render(
      <TaskDetailPage
        task={createTask({ content: "Draft a calmer full-page task editor." })}
        projects={[createProject()]}
        onBack={onBack}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onNotify={vi.fn()}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Task description" });
    fireEvent.change(editor, {
      target: { value: "Draft a calmer full-page task editor.!" },
    });

    view.rerender(
      <TaskDetailPage
        task={createTask({ content: "Draft a calmer full-page task editor." })}
        projects={[createProject()]}
        onBack={onBack}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Task description" })).toHaveValue(
      "Draft a calmer full-page task editor.!",
    );
  });
});
