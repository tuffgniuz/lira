import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewGoalModal } from "./new-goal-modal";

describe("NewGoalModal", () => {
  it("uses the simplified goal flow with explicit task count, period, and project", () => {
    render(
      <NewGoalModal
        isOpen
        onClose={vi.fn()}
        projects={[
          { id: "project-1", name: "Lira" },
          { id: "project-2", name: "Atlas" },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "New Goal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Goal sentence")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "No metric" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daily" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Goal target")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lira" })).toBeInTheDocument();

    expect(screen.queryByText("How this goal works")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add note...")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Tracking mode")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Goal period")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Goal project")).not.toBeInTheDocument();
  });

  it("uses project buttons instead of a dropdown", () => {
    render(
      <NewGoalModal
        isOpen
        onClose={vi.fn()}
        projects={[
          { id: "project-1", name: "Lira" },
          { id: "project-2", name: "Atlas" },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("listbox", { name: "Project options" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select project" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lira" }));

    expect(screen.getByRole("button", { name: "Lira" })).toHaveAttribute("aria-pressed", "true");
  });

  it("submits a task-based goal with the explicit target, period, and project", () => {
    const onSubmit = vi.fn();

    render(
      <NewGoalModal
        isOpen
        onClose={vi.fn()}
        projects={[{ id: "project-1", name: "Lira" }]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Goal sentence"), {
      target: { value: "Review transcript work" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
    fireEvent.change(screen.getByLabelText("Goal target"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    fireEvent.click(screen.getByRole("button", { name: "Lira" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Review transcript work",
      description: "",
      target: 5,
      period: "weekly",
      metric: "tasks_completed",
      projectId: "project-1",
    });
  });

  it("submits a direct-complete goal when no metric is selected", () => {
    const onSubmit = vi.fn();

    render(
      <NewGoalModal
        isOpen
        onClose={vi.fn()}
        projects={[]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Goal sentence"), {
      target: { value: "Study security this week" },
    });
    fireEvent.click(screen.getByRole("button", { name: "No metric" }));
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Study security this week",
      description: "",
      target: 1,
      period: "weekly",
      metric: undefined,
      projectId: "",
    });
  });

  it("hides the target input when no metric is selected", () => {
    render(
      <NewGoalModal
        isOpen
        onClose={vi.fn()}
        projects={[]}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "No metric" }));

    expect(screen.queryByLabelText("Goal target")).not.toBeInTheDocument();
  });

  it("shows no-project and project choices as button states", () => {
    render(
      <NewGoalModal
        isOpen
        onClose={vi.fn()}
        projects={[{ id: "project-1", name: "Transcript Review Agentic Coding" }]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "No project" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Transcript Review Agentic Coding" }));

    expect(
      screen.getByRole("button", { name: "Transcript Review Agentic Coding" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("prefills an existing goal for editing and saves updates", () => {
    const onSubmit = vi.fn();

    render(
      <NewGoalModal
        isOpen
        onClose={vi.fn()}
        projects={[{ id: "project-1", name: "Lira" }]}
        initialGoal={{
          title: "Review transcript work",
          description: "",
          target: 3,
          period: "weekly",
          metric: "tasks_completed",
          projectId: "project-1",
        }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit Goal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Goal sentence")).toHaveValue("Review transcript work");
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Goal target")).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Weekly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Lira" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByLabelText("Goal sentence"), {
      target: { value: "Review transcript work thoroughly" },
    });
    fireEvent.change(screen.getByLabelText("Goal target"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Review transcript work thoroughly",
      description: "",
      target: 5,
      period: "weekly",
      metric: "tasks_completed",
      projectId: "project-1",
    });
  });
});
