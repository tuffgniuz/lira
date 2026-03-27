import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RightRailColumn } from "./right-rail-column";
import type { Item } from "@/models/workspace-item";

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    kind: "task",
    state: "active",
    sourceType: "manual",
    title: "Item",
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
    goalTarget: 3,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    ...overrides,
  };
}

describe("RightRailColumn", () => {
  it("hides the tasks section when there are no system tasks for today", () => {
    render(
      <RightRailColumn
        items={[
          createItem({
            id: "goal-1",
            kind: "goal",
            title: "Finish three tasks",
            goalPeriod: "daily",
            goalMetric: undefined,
            goalTarget: 1,
          }),
        ]}
        todayDate="2026-03-17"
      />,
    );

    expect(screen.getByRole("heading", { name: "Goals" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tasks" })).not.toBeInTheDocument();
  });

  it("shows goal project metadata in the right rail", () => {
    render(
      <RightRailColumn
        items={[
          createItem({
            id: "goal-1",
            kind: "goal",
            title: "Finish three tasks",
            project: "Lira",
            goalPeriod: "daily",
            goalMetric: "tasks_completed",
            goalTarget: 3,
            goalScope: { projectId: "project-1" },
          }),
        ]}
        todayDate="2026-03-17"
      />,
    );

    expect(screen.getByText("Lira • Tasks")).toBeInTheDocument();
  });

  it("shows the daily week strip in the right rail for daily goals", () => {
    render(
      <RightRailColumn
        items={[
          createItem({
            id: "goal-1",
            kind: "goal",
            title: "Finish three tasks",
            project: "Lira",
            goalPeriod: "daily",
            goalMetric: "tasks_completed",
            goalTarget: 3,
            goalScheduleDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            goalScope: { projectId: "project-1" },
          }),
        ]}
        todayDate="2026-03-18"
      />,
    );

    expect(screen.getByLabelText("Finish three tasks week status")).toBeInTheDocument();
    expect(screen.getByLabelText("Monday status: missed")).toBeInTheDocument();
    expect(screen.getByLabelText("Wednesday status: pending")).toBeInTheDocument();
    expect(screen.getByLabelText("Saturday status: off day")).toBeInTheDocument();
  });

  it("shows streak and consistency sections for daily goals", () => {
    render(
      <RightRailColumn
        items={[
          createItem({
            id: "goal-1",
            kind: "goal",
            title: "Daily writing",
            goalPeriod: "daily",
            goalMetric: undefined,
            goalTarget: 1,
            goalProgressByDate: {
              "2026-03-24": 1,
              "2026-03-23": 1,
              "2026-03-22": 0,
            },
          }),
        ]}
        todayDate="2026-03-24"
      />,
    );

    expect(screen.getByRole("heading", { name: "Streaks" })).toBeInTheDocument();
    expect(screen.getByText("2d")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Consistency" })).toBeInTheDocument();
    expect(screen.getByText(/This week/)).toBeInTheDocument();
  });
});
