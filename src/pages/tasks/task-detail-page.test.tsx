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
    ...overrides,
  };
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "Lira",
    description: "",
    boardLanes: defaultProjectBoardLanes("project-1"),
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

  render(
    <TaskDetailPage
      task={createTask()}
      projects={[createProject()]}
      onBack={onBack}
      onUpdateTask={onUpdateTask}
      onDeleteTask={onDeleteTask}
      {...props}
    />,
  );

  return { onBack, onUpdateTask, onDeleteTask };
}

describe("TaskDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vimMocks.editorDom = document.createElement("div");
    vimMocks.delayEditorCreation = false;
  });

  it("renders a centered full-page task detail layout and updates task content", () => {
    vi.useFakeTimers();

    const { onBack, onUpdateTask } = renderTaskDetailPage();

    try {
      const heading = screen.getByRole("heading", { name: "Build task detail page" });
      expect(heading).toBeInTheDocument();
      expect(heading.closest(".task-detail-page__content")).not.toBeNull();
      expect(screen.getByText("Open • Lira")).toBeInTheDocument();

      fireEvent.change(screen.getByRole("textbox", { name: "Task description" }), {
        target: { value: "Ship the dedicated detail page." },
      });

      expect(onUpdateTask).not.toHaveBeenCalled();

      vi.advanceTimersByTime(350);
      expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
        content: "Ship the dedicated detail page.",
      });

      fireEvent.click(screen.getByRole("button", { name: "Back to tasks" }));
      expect(onBack).toHaveBeenCalledTimes(1);
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
      />,
    );

    expect(screen.getByRole("textbox", { name: "Task description" })).toHaveValue(
      "Draft a calmer full-page task editor.!",
    );
  });
});
