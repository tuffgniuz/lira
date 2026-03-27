import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";
import type { Doc } from "@/models/doc";
import { PageContent } from "./page-content";

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    kind: "goal",
    state: "active",
    sourceType: "manual",
    title: "Daily writing",
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
    goalProgress: 1,
    goalProgressByDate: {
      "2026-03-24": 1,
    },
    goalPeriod: "daily",
    ...overrides,
  };
}

function renderDashboardPageContent({
  items = [createItem()],
  docs = [],
  projects = [],
  rightRailMode = "auto",
}: {
  items?: Item[];
  docs?: Doc[];
  projects?: Project[];
  rightRailMode?: "auto" | "pinned" | "hidden";
} = {}) {
  render(
    <PageContent
      activeView="dashboard"
      items={items}
      docs={docs}
      todayDate="2026-03-24"
      projects={projects}
      selectedProjectId=""
      selectedGoalId=""
      selectedTaskId=""
      selectedDocId=""
      onSelectGoal={vi.fn()}
      onUpdateGoal={vi.fn()}
      onDeleteGoal={vi.fn()}
      onEditGoal={vi.fn()}
      onCreateTask={vi.fn()}
      onSelectTask={vi.fn()}
      onOpenProjectTask={vi.fn()}
      onCloseTaskDetail={vi.fn()}
      onUpdateTask={vi.fn()}
      onDeleteTask={vi.fn()}
      onCloseDocDetail={vi.fn()}
      onUpdateDoc={vi.fn()}
      onDeleteDoc={vi.fn()}
      onUpdateProject={vi.fn()}
      onCreateCapture={vi.fn()}
      onConvertCaptureToTask={vi.fn()}
      onConvertCaptureToGoal={vi.fn()}
      onUpdateCaptureState={vi.fn()}
      onDeleteCapture={vi.fn()}
      onNotify={vi.fn()}
      onOpenGoalFromDashboard={vi.fn()}
      rightRailMode={rightRailMode}
      taskDraftResetKeys={{}}
      docDraftResetKeys={{}}
    />,
  );
}

describe("PageContent dashboard", () => {
  it("shows the shared right-rail insights panel on the dashboard", () => {
    renderDashboardPageContent();

    expect(screen.getByRole("heading", { name: "Goals" })).toBeInTheDocument();
  });

  it("keeps dashboard insights visible even when right rail mode is hidden", () => {
    renderDashboardPageContent({ rightRailMode: "hidden" });

    expect(screen.getByLabelText("Dashboard insights")).toBeInTheDocument();
  });
});
