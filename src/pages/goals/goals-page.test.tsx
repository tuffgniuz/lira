import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalsPage } from "./goals-page";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });

  fireEvent(window, new Event("resize"));
}

function createGoal(overrides: Partial<Item> = {}): Item {
  return {
    id: "goal-1",
    kind: "goal",
    state: "active",
    sourceType: "manual",
    title: "Complete 5 tasks",
    content: "Progress updates from completed tasks in the current period.",
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
    goalTarget: 5,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "daily",
    ...overrides,
  } as Item;
}

describe("GoalsPage", () => {
  it("shows the selected goal even when its period is not the default filter", () => {
    render(
      <GoalsPage
        items={[
          {
            id: "goal-1",
            kind: "goal",
            state: "active",
            sourceType: "manual",
            title: "Ship the weekly review",
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
            goalMetric: undefined,
            goalTarget: 1,
            goalProgress: 0,
            goalProgressByDate: {},
            goalPeriod: "weekly",
          },
        ] as Item[]}
        projects={[] as Project[]}
        todayDate="2026-03-17"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByText("Ship the weekly review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toHaveClass("is-active");
  });

  it("lets a metric-less goal be marked complete from the goal card", () => {
    const onUpdateGoal = vi.fn();

    render(
      <GoalsPage
        items={[
          {
            id: "goal-1",
            kind: "goal",
            state: "active",
            sourceType: "manual",
            title: "Study security this week",
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
            goalMetric: undefined,
            goalTarget: 1,
            goalProgress: 0,
            goalProgressByDate: {},
            goalPeriod: "weekly",
          },
        ] as Item[]}
        projects={[] as Project[]}
        todayDate="2026-03-17"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark Study security this week complete" }));

    expect(onUpdateGoal).toHaveBeenCalledWith("goal-1", {
      goalProgress: 1,
      goalProgressByDate: {
        "2026-03-17": 1,
      },
    });
  });

  it("lets linked goal tasks be completed, edited, or deleted from the goal card", () => {
    const onUpdateGoal = vi.fn();
    const onUpdateTask = vi.fn();
    const onDeleteTask = vi.fn();
    const onSelectTask = vi.fn();

    render(
      <GoalsPage
        items={[
          {
            id: "goal-1",
            kind: "goal",
            state: "active",
            sourceType: "manual",
            title: "Complete 2 tasks this week",
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
            goalTarget: 2,
            goalProgress: 0,
            goalProgressByDate: {},
            goalPeriod: "weekly",
            goalScope: { taskIds: ["task-1"] },
          },
          {
            id: "task-1",
            kind: "task",
            state: "active",
            sourceType: "manual",
            title: "Review task 1",
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
          },
        ] as Item[]}
        projects={[] as Project[]}
        todayDate="2026-03-17"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Complete Review task 1" }));
    expect(onUpdateTask).toHaveBeenCalledWith("task-1", { isCompleted: true });

    fireEvent.click(screen.getByRole("button", { name: "Review task 1" }));
    expect(onSelectTask).toHaveBeenCalledWith("task-1");

    expect(screen.queryByRole("button", { name: "Delete Review task 1" })).not.toBeInTheDocument();
  });

  it("does not show a quick-add button for task-metric goals", () => {
    render(
      <GoalsPage
        items={[
          {
            id: "goal-1",
            kind: "goal",
            state: "active",
            sourceType: "manual",
            title: "Complete 3 tasks each day",
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
            goalTarget: 3,
            goalProgress: 0,
            goalProgressByDate: {},
            goalPeriod: "daily",
          },
        ] as Item[]}
        projects={[] as Project[]}
        todayDate="2026-03-17"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Add task to Complete 3 tasks each day" }),
    ).not.toBeInTheDocument();
  });

  it("shows a weekly day strip for daily goals with met, missed, pending, and off-day states", () => {
    render(
      <GoalsPage
        items={[
          createGoal({
            title: "Complete the daily practice",
            goalPeriod: "daily",
            goalMetric: undefined,
            goalTarget: 1,
            goalScheduleDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            goalProgressByDate: {
              "2026-03-16": 1,
            },
          }),
        ] as Item[]}
        projects={[] as Project[]}
        todayDate="2026-03-18"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    const goalCard = screen.getByRole("article");
    const weekStripQueries = within(goalCard);

    expect(weekStripQueries.getByText("Mon")).toBeInTheDocument();
    expect(weekStripQueries.getByText("Tue")).toBeInTheDocument();
    expect(weekStripQueries.getByText("Wed")).toBeInTheDocument();
    expect(weekStripQueries.getByText("Thu")).toBeInTheDocument();
    expect(weekStripQueries.getByText("Fri")).toBeInTheDocument();
    expect(weekStripQueries.getByText("Sat")).toBeInTheDocument();
    expect(weekStripQueries.getByText("Sun")).toBeInTheDocument();
    expect(weekStripQueries.getByLabelText("Mark incomplete for Monday")).toBeInTheDocument();
    expect(weekStripQueries.getByLabelText("Mark complete for Tuesday")).toBeInTheDocument();
    expect(weekStripQueries.getByLabelText("Mark complete for Wednesday")).toBeInTheDocument();
    expect(weekStripQueries.getByLabelText("Saturday status: off day")).toBeInTheDocument();
  });

  it("renders milestone goals and toggles milestone completion", () => {
    const onUpdateGoal = vi.fn();

    render(
      <GoalsPage
        items={[
          createGoal({
            title: "Ship the monthly review",
            goalMetric: undefined,
            goalTarget: 2,
            goalPeriod: "monthly",
            goalMilestones: [
              { id: "milestone-1", title: "Draft review", isCompleted: false, completedAt: "" },
              { id: "milestone-2", title: "Publish review", isCompleted: true, completedAt: "2026-03-18" },
            ],
          }),
        ] as Item[]}
        projects={[] as Project[]}
        todayDate="2026-03-22"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Complete milestone Draft review" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Complete milestone Publish review" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Complete milestone Draft review" }));

    expect(onUpdateGoal).toHaveBeenCalledWith("goal-1", {
      goalMilestones: [
        expect.objectContaining({
          id: "milestone-1",
          title: "Draft review",
          isCompleted: true,
        }),
        expect.objectContaining({
          id: "milestone-2",
          title: "Publish review",
          isCompleted: true,
        }),
      ],
      goalProgress: 2,
    });
  });

  it("wraps the empty goals state in a centered center-column shell", () => {
    render(
      <GoalsPage
        items={[] as Item[]}
        projects={[] as Project[]}
        todayDate="2026-03-17"
        selectedGoalId=""
        onSelectGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByTestId("goals-empty-shell")).toBeInTheDocument();
    expect(screen.getByText("No daily goals yet")).toBeInTheDocument();
  });

  it("keeps goal period filters accessible when the left rail collapses on medium widths", () => {
    setViewportWidth(1100);

    render(
      <GoalsPage
        items={[createGoal()]}
        projects={[] as Project[]}
        todayDate="2026-03-17"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByTestId("goals-inline-periods")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daily" })).toHaveClass("is-active");
    expect(screen.queryByTestId("goals-stacked-insights")).not.toBeInTheDocument();
  });

  it("moves insights below the main goals column on narrow widths", () => {
    setViewportWidth(800);

    render(
      <GoalsPage
        items={[createGoal()]}
        projects={[] as Project[]}
        todayDate="2026-03-17"
        selectedGoalId="goal-1"
        onSelectGoal={vi.fn()}
        onUpdateGoal={vi.fn()}
        onDeleteGoal={vi.fn()}
        onEditGoal={vi.fn()}
        onSelectTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByTestId("goals-inline-periods")).toBeInTheDocument();
    expect(screen.getByTestId("goals-stacked-insights")).toBeInTheDocument();
  });
});
