import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TasksPage } from "./tasks-page";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";

function createItem(overrides: Partial<Item> = {}): Item {
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

describe("TasksPage", () => {
  it("filters tasks by open and completed instead of task status", () => {
    render(
      <TasksPage
        items={[
          createItem({ id: "task-1", title: "Open task" }),
          createItem({ id: "task-2", title: "Completed task", isCompleted: true }),
        ]}
        projects={[] as Project[]}
        onSelectTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.getByText("Completed task")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.queryByText("Completed task")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getByText("Completed task")).toBeInTheDocument();
    expect(screen.queryByText("Open task")).not.toBeInTheDocument();
  });

  it("shows per-filter count badges in the task filter row", () => {
    render(
      <TasksPage
        items={[
          createItem({ id: "task-1", title: "Open task" }),
          createItem({ id: "task-2", title: "Second open task" }),
          createItem({ id: "task-3", title: "Completed task", isCompleted: true }),
        ]}
        projects={[] as Project[]}
        onSelectTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    const filters = screen.getByLabelText("Task filters");
    expect(within(within(filters).getByRole("button", { name: "Open" })).getByText("2")).toBeInTheDocument();
    expect(within(within(filters).getByRole("button", { name: "Completed" })).getByText("1")).toBeInTheDocument();
    expect(within(within(filters).getByRole("button", { name: "All" })).getByText("3")).toBeInTheDocument();
  });

  it("switches task filters with 1 2 and 3", () => {
    render(
      <TasksPage
        items={[
          createItem({ id: "task-1", title: "Open task" }),
          createItem({ id: "task-2", title: "Completed task", isCompleted: true }),
        ]}
        projects={[] as Project[]}
        onSelectTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.getByText("Completed task")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.queryByText("Completed task")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByText("Completed task")).toBeInTheDocument();
    expect(screen.queryByText("Open task")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "3" });
    expect(screen.getByText("Open task")).toBeInTheDocument();
    expect(screen.getByText("Completed task")).toBeInTheDocument();
  });

  it("moves the active task selection with j k and arrow keys only", () => {
    render(
      <TasksPage
        items={[
          createItem({ id: "task-1", title: "First task" }),
          createItem({ id: "task-2", title: "Second task" }),
          createItem({ id: "task-3", title: "Third task" }),
        ]}
        projects={[] as Project[]}
        onSelectTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByRole("row", { name: /First task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByRole("row", { name: /Second task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("row", { name: /Third task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getByRole("row", { name: /Second task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByRole("row", { name: /First task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "x" });
    expect(screen.getByRole("row", { name: /First task/i })).toHaveClass("is-active");
  });

  it("opens the currently selected task with Enter", () => {
    const onSelectTask = vi.fn();

    render(
      <TasksPage
        items={[
          createItem({ id: "task-1", title: "First task" }),
          createItem({ id: "task-2", title: "Second task" }),
        ]}
        projects={[] as Project[]}
        onSelectTask={onSelectTask}
        onDeleteTask={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByRole("row", { name: /Second task/i })).toHaveClass("is-active");

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onSelectTask).toHaveBeenCalledWith("task-2");
  });

  it("opens a delete confirmation with d d and deletes on confirm", () => {
    const onDeleteTask = vi.fn();

    render(
      <TasksPage
        items={[
          createItem({ id: "task-1", title: "First task" }),
          createItem({ id: "task-2", title: "Second task" }),
        ]}
        projects={[] as Project[]}
        onSelectTask={vi.fn()}
        onDeleteTask={onDeleteTask}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "d" });
    fireEvent.keyDown(window, { key: "d" });

    expect(screen.getByText("Delete task")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDeleteTask).toHaveBeenCalledWith("task-2");
  });
});
