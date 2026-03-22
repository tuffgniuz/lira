import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewProjectModal } from "./new-project-modal";

describe("NewProjectModal", () => {
  it("submits projects with kanban disabled by default", () => {
    const onSubmit = vi.fn();

    render(
      <NewProjectModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: { value: "Inbox Cleanup" },
    });
    fireEvent.submit(screen.getByRole("textbox", { name: "Project name" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Inbox Cleanup",
      description: "",
      hasKanbanBoard: false,
    });
  });

  it("lets the user explicitly enable the kanban board before creating the project", () => {
    const onSubmit = vi.fn();

    render(
      <NewProjectModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText("View")).not.toBeInTheDocument();
    expect(screen.queryByText("Leave this off to start with a simple task list.")).not.toBeInTheDocument();
    const toggle = screen.getByRole("checkbox", { name: "Enable kanban board" });
    expect(toggle).toHaveClass(
      "project-mode-toggle__checkbox",
    );
    expect(toggle.closest("label")).toHaveClass("project-mode-toggle");
    const switchControl = toggle.closest("label")?.querySelector(".project-mode-toggle__switch");
    expect(switchControl).not.toBeNull();
    expect(switchControl).not.toHaveClass("is-checked");
    expect(toggle.closest("label")).not.toHaveClass("is-checked");

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: { value: "Delivery Tracking" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Enable kanban board" }));
    expect(switchControl).toHaveClass("is-checked");
    expect(toggle.closest("label")).toHaveClass("is-checked");
    fireEvent.submit(screen.getByRole("textbox", { name: "Project name" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Delivery Tracking",
      description: "",
      hasKanbanBoard: true,
    });
  });

  it("submits with Enter when the kanban toggle is focused", () => {
    const onSubmit = vi.fn();

    render(
      <NewProjectModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: { value: "Keyboard Project" },
    });

    const toggle = screen.getByRole("checkbox", { name: "Enable kanban board" });
    fireEvent.click(toggle);
    toggle.focus();
    fireEvent.keyDown(toggle, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Keyboard Project",
      description: "",
      hasKanbanBoard: true,
    });
  });
});
