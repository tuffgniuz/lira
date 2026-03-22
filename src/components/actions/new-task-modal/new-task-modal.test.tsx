import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewTaskModal } from "./new-task-modal";

describe("NewTaskModal", () => {
  it("keeps fields accessible without rendering visible field labels", () => {
    render(
      <NewTaskModal
        isOpen
        onClose={vi.fn()}
        goals={[]}
        projects={[
          { id: "project-1", name: "Lira" },
          { id: "project-2", name: "Atlas" },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Task title" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Task description" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lira" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Task project" })).not.toBeInTheDocument();

    expect(screen.queryByText("Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
    expect(screen.queryByText("Project")).not.toBeInTheDocument();
  });

  it("submits the selected project from project choice buttons", () => {
    const onSubmit = vi.fn();

    render(
      <NewTaskModal
        isOpen
        onClose={vi.fn()}
        goals={[]}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Task title" }), {
      target: { value: "Ship task flow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.submit(screen.getByRole("textbox", { name: "Task title" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Ship task flow",
      description: "",
      goalId: "",
      projectId: "project-1",
      openDetailOnSuccess: true,
    });
  });

  it("submits the selected goal when linking a task to a goal", () => {
    const onSubmit = vi.fn();

    render(
      <NewTaskModal
        isOpen
        onClose={vi.fn()}
        goals={[
          { id: "goal-1", title: "Complete 5 review tasks", remainingSlots: 3, projectId: "project-1" },
        ]}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Task title" }), {
      target: { value: "Review task 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete 5 review tasks" }));
    fireEvent.submit(screen.getByRole("textbox", { name: "Task title" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Review task 1",
      description: "",
      goalId: "goal-1",
      projectId: "project-1",
      openDetailOnSuccess: true,
    });
  });

  it("submits from the description field with Enter and keeps Shift+Enter for a newline", () => {
    const onSubmit = vi.fn();

    render(
      <NewTaskModal
        isOpen
        onClose={vi.fn()}
        goals={[]}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Task title" }), {
      target: { value: "Ship task flow" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Task description" }), {
      key: "Enter",
    });

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Ship task flow",
      description: "",
      goalId: "",
      projectId: "",
      openDetailOnSuccess: true,
    });

    expect(screen.queryByRole("button", { name: "Save task" })).not.toBeInTheDocument();
  });

  it("does not submit on Shift+Enter inside the description field", () => {
    const onSubmit = vi.fn();

    render(
      <NewTaskModal
        isOpen
        onClose={vi.fn()}
        goals={[]}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Task title" }), {
      target: { value: "Ship task flow" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Task description" }), {
      key: "Enter",
      shiftKey: true,
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables goals that already reached their task limit", () => {
    render(
      <NewTaskModal
        isOpen
        onClose={vi.fn()}
        goals={[
          { id: "goal-1", title: "Complete 5 review tasks", remainingSlots: 0, projectId: "project-1" },
        ]}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Complete 5 review tasks" })).toBeDisabled();
  });
});
