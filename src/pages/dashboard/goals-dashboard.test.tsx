import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Item } from "@/models/workspace-item";
import { GoalsDashboard } from "./goals-dashboard";

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    kind: "goal",
    state: "active",
    sourceType: "manual",
    title: "Goal",
    content: "",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    tags: [],
    project: "",
    isCompleted: false,
    priority: "",
    dueDate: "",
    completedAt: "",
    estimate: "",
    goalMetric: undefined,
    goalTarget: 1,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "daily",
    ...overrides,
  };
}

describe("GoalsDashboard", () => {
  it("switches dashboard ranges through keyboard 1/2/3 shortcuts", () => {
    render(
      <GoalsDashboard
        items={[createItem()]}
        todayDate="2026-03-24"
        onOpenGoal={vi.fn()}
      />,
    );

    const board = screen.getByRole("region", { name: "Goal momentum dashboard" });
    board.focus();

    fireEvent.keyDown(board, { key: "2" });
    expect(screen.getByRole("button", { name: "14d" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(board, { key: "3" });
    expect(screen.getByRole("button", { name: "30d" })).toHaveAttribute("aria-pressed", "true");
  });

  it("cycles filters with f and opens selected goal with Enter", () => {
    const onOpenGoal = vi.fn();

    render(
      <GoalsDashboard
        items={[
          createItem({
            id: "goal-a",
            title: "Ship report",
            goalProgressByDate: { "2026-03-24": 1 },
          }),
          createItem({
            id: "goal-b",
            title: "Stuck goal",
            goalProgressByDate: { "2026-03-24": 0 },
          }),
        ]}
        todayDate="2026-03-24"
        onOpenGoal={onOpenGoal}
      />,
    );

    const board = screen.getByRole("region", { name: "Goal momentum dashboard" });
    board.focus();

    fireEvent.keyDown(board, { key: "f" });
    expect(screen.getByRole("button", { name: "Filter: on track" })).toBeInTheDocument();

    fireEvent.keyDown(board, { key: "Enter" });
    expect(onOpenGoal).toHaveBeenCalledWith("goal-a");
  });

  it("moves selected goal with j/k", () => {
    render(
      <GoalsDashboard
        items={[
          createItem({ id: "goal-a", title: "Goal A", goalProgressByDate: { "2026-03-24": 1 } }),
          createItem({ id: "goal-b", title: "Goal B", goalProgressByDate: { "2026-03-24": 1 } }),
        ]}
        todayDate="2026-03-24"
        onOpenGoal={vi.fn()}
      />,
    );

    const board = screen.getByRole("region", { name: "Goal momentum dashboard" });
    board.focus();

    expect(screen.getByRole("button", { name: "Goal A · on track" })).toHaveAttribute("aria-current", "true");

    fireEvent.keyDown(board, { key: "j" });
    expect(screen.getByRole("button", { name: "Goal B · on track" })).toHaveAttribute("aria-current", "true");

    fireEvent.keyDown(board, { key: "k" });
    expect(screen.getByRole("button", { name: "Goal A · on track" })).toHaveAttribute("aria-current", "true");
  });

  it("renders one dashboard card and chart per visible goal", () => {
    render(
      <GoalsDashboard
        items={[
          createItem({ id: "goal-a", title: "Goal A", goalProgressByDate: { "2026-03-24": 1 } }),
          createItem({ id: "goal-b", title: "Goal B", goalProgressByDate: { "2026-03-24": 0 } }),
        ]}
        todayDate="2026-03-24"
        onOpenGoal={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("article", { name: /goal dashboard card/i })).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Goal A pace chart" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Goal B pace chart" })).toBeInTheDocument();
  });
});
