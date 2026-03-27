import { describe, expect, it } from "vitest";
import type { Item } from "@/models/workspace-item";
import { buildGoalDashboardModel } from "./goal-dashboard";

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
    goalMetric: "tasks_completed",
    goalTarget: 10,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    ...overrides,
  };
}

describe("goal dashboard model", () => {
  it("classifies goals by pace ratio thresholds", () => {
    const onTrackTaskIds = Array.from({ length: 10 }, (_, index) => `on-${index}`);
    const atRiskTaskIds = Array.from({ length: 8 }, (_, index) => `risk-${index}`);
    const behindTaskIds = Array.from({ length: 5 }, (_, index) => `behind-${index}`);

    const goals: Item[] = [
      createItem({
        id: "goal-on-track",
        title: "On track goal",
        goalScope: { taskIds: onTrackTaskIds },
      }),
      createItem({
        id: "goal-at-risk",
        title: "At risk goal",
        goalScope: { taskIds: atRiskTaskIds },
      }),
      createItem({
        id: "goal-behind",
        title: "Behind goal",
        goalScope: { taskIds: behindTaskIds },
      }),
    ];

    const tasks: Item[] = [...onTrackTaskIds, ...atRiskTaskIds, ...behindTaskIds].map((id) =>
      createItem({
        id,
        kind: "task",
        title: id,
        isCompleted: true,
        completedAt: "2026-03-24",
      }),
    );

    const model = buildGoalDashboardModel({
      items: [...goals, ...tasks],
      todayDate: "2026-03-24",
      rangeDays: 14,
    });

    expect(model.goals.find((goal) => goal.id === "goal-on-track")?.status).toBe("on_track");
    expect(model.goals.find((goal) => goal.id === "goal-at-risk")?.status).toBe("at_risk");
    expect(model.goals.find((goal) => goal.id === "goal-behind")?.status).toBe("behind");
  });

  it("builds cumulative series for selected range with expected trajectory", () => {
    const goal = createItem({
      id: "goal-series",
      title: "Series goal",
      goalMetric: undefined,
      goalTarget: 1,
      goalPeriod: "daily",
      goalProgressByDate: {
        "2026-03-18": 1,
        "2026-03-20": 1,
      },
    });

    const model = buildGoalDashboardModel({
      items: [goal],
      todayDate: "2026-03-24",
      rangeDays: 7,
    });

    const series = model.goals[0]?.series ?? [];
    const finalPoint = series[series.length - 1];

    expect(series).toHaveLength(7);
    expect(series[0]?.expectedCumulative).toBeGreaterThan(0);
    expect(finalPoint?.actualCumulative).toBe(2);
    expect(finalPoint?.pacePercent).toBeGreaterThan(25);
    expect(finalPoint?.pacePercent).toBeLessThan(35);
  });

  it("builds seven-day heat cells from recent daily progress", () => {
    const goal = createItem({
      id: "goal-heat",
      title: "Heat goal",
      goalMetric: undefined,
      goalTarget: 2,
      goalPeriod: "daily",
      goalProgressByDate: {
        "2026-03-24": 2,
        "2026-03-23": 1,
      },
    });

    const model = buildGoalDashboardModel({
      items: [goal],
      todayDate: "2026-03-24",
      rangeDays: 7,
    });

    const heat = model.goals[0]?.weeklyHeat ?? [];
    const todayCell = heat.find((cell) => cell.date === "2026-03-24");
    const yesterdayCell = heat.find((cell) => cell.date === "2026-03-23");

    expect(heat).toHaveLength(7);
    expect(todayCell?.ratio).toBe(1);
    expect(yesterdayCell?.ratio).toBe(0.5);
  });
});
