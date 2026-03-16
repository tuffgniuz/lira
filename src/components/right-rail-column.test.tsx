import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RightRailColumn } from "./right-rail-column";
import type { Item } from "../models/item";

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
    taskStatus: "inbox",
    priority: "",
    dueDate: "",
    completedAt: "",
    estimate: "",
    goalMetric: "tasks_completed",
    goalTarget: 3,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    goalTrackingMode: "automatic",
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
            goalTrackingMode: "manual",
            goalMetric: "manual_units",
            goalTarget: 3,
          }),
        ]}
        journalSummaries={[]}
        todayDate="2026-03-17"
      />,
    );

    expect(screen.getByRole("heading", { name: "Goals" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tasks" })).not.toBeInTheDocument();
  });
});
