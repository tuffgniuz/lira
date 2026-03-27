import { useEffect, useMemo, useState } from "react";
import { buildGoalDashboardModel, type GoalDashboardRangeDays, type GoalDashboardStatus } from "@/lib/domain/goal-dashboard";
import type { Item } from "@/models/workspace-item";

const rangeOptions: GoalDashboardRangeDays[] = [7, 14, 30];
const filterOrder: Array<"all" | GoalDashboardStatus> = ["all", "on_track", "at_risk", "behind"];

export function GoalsDashboard({
  items,
  todayDate,
  onOpenGoal,
}: {
  items: Item[];
  todayDate: string;
  onOpenGoal: (goalId: string) => void;
}) {
  const [rangeDays, setRangeDays] = useState<GoalDashboardRangeDays>(14);
  const [filter, setFilter] = useState<"all" | GoalDashboardStatus>("all");
  const model = useMemo(
    () => buildGoalDashboardModel({ items, todayDate, rangeDays }),
    [items, todayDate, rangeDays],
  );
  const filteredGoals = useMemo(
    () => model.goals.filter((goal) => filter === "all" || goal.status === filter),
    [filter, model.goals],
  );
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const selectedGoal = filteredGoals.find((goal) => goal.id === selectedGoalId) ?? filteredGoals[0] ?? null;

  useEffect(() => {
    if (!selectedGoalId || !filteredGoals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(filteredGoals[0]?.id ?? "");
    }
  }, [filteredGoals, selectedGoalId]);

  function cycleFilter() {
    const currentIndex = filterOrder.indexOf(filter);
    const next = filterOrder[(currentIndex + 1) % filterOrder.length] ?? "all";
    setFilter(next);
  }

  function selectByOffset(offset: 1 | -1) {
    if (!filteredGoals.length) {
      return;
    }

    const currentIndex = filteredGoals.findIndex((goal) => goal.id === selectedGoal?.id);
    const anchor = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (anchor + offset + filteredGoals.length) % filteredGoals.length;
    const next = filteredGoals[nextIndex];

    if (next) {
      setSelectedGoalId(next.id);
    }
  }

  return (
    <section
      className="goals-dashboard"
      role="region"
      aria-label="Goal momentum dashboard"
      tabIndex={0}
      onKeyDown={(event) => {
        const key = event.key.toLowerCase();

        if (key === "1") {
          setRangeDays(7);
          return;
        }

        if (key === "2") {
          setRangeDays(14);
          return;
        }

        if (key === "3") {
          setRangeDays(30);
          return;
        }

        if (key === "f") {
          cycleFilter();
          return;
        }

        if (key === "j") {
          selectByOffset(1);
          return;
        }

        if (key === "k") {
          selectByOffset(-1);
          return;
        }

        if (event.key === "Enter" && selectedGoal) {
          onOpenGoal(selectedGoal.id);
          return;
        }

        if (event.key === "Escape") {
          setFilter("all");
          setSelectedGoalId(filteredGoals[0]?.id ?? "");
        }
      }}
    >
      <header className="goals-dashboard__header">
        <div>
          <h2 className="goals-dashboard__title">Momentum</h2>
          <div className="goals-dashboard__controls">
            <div className="goals-dashboard__range" role="group" aria-label="Range">
              {rangeOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`goals-dashboard__range-button ${rangeDays === value ? "is-active" : ""}`}
                  aria-pressed={rangeDays === value}
                  onClick={() => setRangeDays(value)}
                >
                  {value}d
                </button>
              ))}
            </div>
            <button
              type="button"
              className="goals-dashboard__filter"
              onClick={cycleFilter}
              aria-label={`Filter: ${formatFilterLabel(filter)}`}
            >
              Filter: {formatFilterLabel(filter)}
            </button>
          </div>
        </div>
      </header>

      {filteredGoals.length === 0 ? (
        <p className="goals-dashboard__empty">No goals in this filter.</p>
      ) : (
        <>
          <div className="goals-dashboard__cards" role="list" aria-label="Goal dashboard cards">
            {filteredGoals.map((goal) => (
              <article
                key={goal.id}
                role="article"
                aria-label={`Goal dashboard card: ${goal.title}`}
                className={`goals-dashboard__card ${goal.id === selectedGoal?.id ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className={`goals-dashboard__chip goals-dashboard__chip--${goal.status} ${
                    goal.id === selectedGoal?.id ? "is-active" : ""
                  }`}
                  aria-label={`${goal.title} · ${formatStatusLabel(goal.status)}`}
                  aria-current={goal.id === selectedGoal?.id ? "true" : "false"}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <span className="goals-dashboard__chip-dot" style={{ background: goal.colorToken }} />
                  <span>{goal.title}</span>
                  <span className="goals-dashboard__chip-status">{formatStatusLabel(goal.status)}</span>
                </button>

                <GoalCardChart goal={goal} />

                <div className="goals-dashboard__foot">
                  <div className="goals-dashboard__summary">
                    <p>
                      {goal.currentValue} / {goal.targetValue}
                    </p>
                    <p>{Math.round(goal.completionRatio * 100)}% of target</p>
                  </div>
                  <div className="goals-dashboard__heat" aria-label={`${goal.title} weekly consistency`}>
                    {goal.weeklyHeat.map((cell) => (
                      <span
                        key={cell.date}
                        className="goals-dashboard__heat-cell"
                        style={{ opacity: Math.max(0.2, Math.min(1, cell.ratio)) }}
                        title={`${cell.date}: ${Math.round(cell.ratio * 100)}%`}
                      />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="goals-dashboard__totals">
            <span>On track {model.summary.onTrack}</span>
            <span>At risk {model.summary.atRisk}</span>
            <span>Behind {model.summary.behind}</span>
          </div>
        </>
      )}
    </section>
  );
}

function GoalCardChart({
  goal,
}: {
  goal: ReturnType<typeof buildGoalDashboardModel>["goals"][number];
}) {
  const width = 100;
  const height = 42;
  const paddingX = 2;
  const paddingY = 3;
  const maxPace = Math.max(120, ...goal.series.map((point) => point.pacePercent));
  const maxY = Math.min(240, maxPace);
  const step = goal.series.length > 1
    ? (width - paddingX * 2) / (goal.series.length - 1)
    : 0;
  const targetY = mapY(100, maxY, height, paddingY);

  return (
    <svg
      className="goals-dashboard__chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${goal.title} pace chart`}
    >
      <line
        x1={paddingX}
        x2={width - paddingX}
        y1={targetY}
        y2={targetY}
        className="goals-dashboard__target-line"
      />
      <polyline
        className="goals-dashboard__line"
        style={{ stroke: goal.colorToken }}
        points={goal.series.map((point, index) => {
          const x = paddingX + step * index;
          const y = mapY(point.pacePercent, maxY, height, paddingY);
          return `${x},${y}`;
        }).join(" ")}
      />
    </svg>
  );
}

function mapY(value: number, maxY: number, height: number, paddingY: number) {
  const safeMax = Math.max(1, maxY);
  const clamped = Math.max(0, Math.min(safeMax, value));
  const drawableHeight = height - paddingY * 2;
  return height - paddingY - (clamped / safeMax) * drawableHeight;
}

function formatFilterLabel(filter: "all" | GoalDashboardStatus) {
  return filter === "all" ? "all" : formatStatusLabel(filter);
}

function formatStatusLabel(status: GoalDashboardStatus) {
  return status.replace("_", " ");
}
