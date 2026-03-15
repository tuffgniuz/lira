import { useMemo } from "react";
import type { GoalMetricType, GoalPeriod, Item } from "../../models/item";

type GoalsPageProps = {
  items: Item[];
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Item>) => void;
};

const periodOrder: GoalPeriod[] = ["daily", "weekly", "monthly", "yearly"];

export function GoalsPage({
  items,
  selectedGoalId,
  onSelectGoal,
  onUpdateGoal,
}: GoalsPageProps) {
  const selectedGoal =
    items.find((item) => item.id === selectedGoalId && item.kind === "goal") ?? null;
  const groupedGoals = useMemo(
    () =>
      periodOrder.map((period) => ({
        period,
        items: items
          .filter(
            (item) =>
              item.kind === "goal" &&
              item.goalPeriod === period &&
              item.state !== "archived" &&
              item.state !== "deleted",
          )
          .map((goal) => {
            const progressValue = computeGoalProgress(goal, items);

            return {
              goal,
              progressValue: progressValue,
              progressRatio: Math.min(progressValue / goal.goalTargetValue, 1),
            };
          }),
      })),
    [items],
  );

  return (
    <section className="page page--goals" aria-label="Goals">
      <div className="page__header page__header--goals">
        <div>
          <p className="page__eyebrow">Goals</p>
        </div>
      </div>

      <div className="goals-stage">
        <div className="goals-list">
          {groupedGoals.map((group) =>
            group.items.length > 0 ? (
              <section key={group.period} className="goal-group">
                <h2 className="goal-group__title">{labelForPeriod(group.period)}</h2>
                <div className="goal-group__rows">
                  {group.items.map(({ goal, progressValue, progressRatio }) => (
                    <button
                      key={goal.id}
                      type="button"
                      className={`goal-row ${selectedGoalId === goal.id ? "is-active" : ""}`}
                      onClick={() => onSelectGoal(goal.id)}
                    >
                      <div className="goal-row__main">
                        <div className="goal-row__copy">
                          <span className="goal-row__title">{goal.title}</span>
                          <span className="goal-row__meta">
                            {labelForMetric(goal.goalMetricType)}
                            {goal.project ? ` • ${goal.project}` : ""}
                            {goal.tags[0] ? ` • #${goal.tags[0]}` : ""}
                          </span>
                        </div>
                        <span className="goal-row__progress">
                          {progressValue} / {goal.goalTargetValue}
                        </span>
                      </div>
                      <span className="goal-row__bar" aria-hidden="true">
                        <span
                          className="goal-row__bar-fill"
                          style={{ transform: `scaleX(${progressRatio})` }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null,
          )}

          {groupedGoals.every((group) => group.items.length === 0) ? (
            <div className="goals-empty">
              <p className="goals-empty__title">No goals yet</p>
              <p className="goals-empty__copy">Use `n g` to create your first goal.</p>
            </div>
          ) : null}
        </div>

        <aside
          className={`goal-detail-panel ${selectedGoal ? "is-open" : ""}`}
          aria-label="Goal detail"
          aria-hidden={selectedGoal ? undefined : true}
        >
          {selectedGoal ? (
            <div className="goal-detail-pane__content">
              <h2 className="task-detail-pane__title">{selectedGoal.title}</h2>
              <p className="task-detail-pane__meta">
                {labelForPeriod(selectedGoal.goalPeriod)} •{" "}
                {labelForMetric(selectedGoal.goalMetricType)}
              </p>

              <div className="goal-detail-form">
                <label className="goal-detail-form__field">
                  <span className="goal-detail-form__label">Title</span>
                  <input
                    value={selectedGoal.title}
                    onChange={(event) =>
                      onUpdateGoal(selectedGoal.id, { title: event.target.value })
                    }
                    className="goal-detail-form__input"
                    aria-label="Goal title"
                  />
                </label>
                <label className="goal-detail-form__field">
                  <span className="goal-detail-form__label">Description</span>
                  <textarea
                    value={selectedGoal.content}
                    onChange={(event) =>
                      onUpdateGoal(selectedGoal.id, { content: event.target.value })
                    }
                    className="goal-detail-form__textarea"
                    aria-label="Goal description"
                  />
                </label>
                <div className="goal-detail-form__grid">
                  <label className="goal-detail-form__field">
                    <span className="goal-detail-form__label">Target</span>
                    <input
                      value={selectedGoal.goalTargetValue}
                      onChange={(event) => {
                        const nextValue = Number.parseInt(event.target.value, 10);
                        onUpdateGoal(selectedGoal.id, {
                          goalTargetValue:
                            Number.isNaN(nextValue) || nextValue <= 0 ? 1 : nextValue,
                        });
                      }}
                      className="goal-detail-form__input"
                      inputMode="numeric"
                      aria-label="Goal target"
                    />
                  </label>
                  <label className="goal-detail-form__field">
                    <span className="goal-detail-form__label">Period</span>
                    <select
                      value={selectedGoal.goalPeriod}
                      onChange={(event) =>
                        onUpdateGoal(selectedGoal.id, {
                          goalPeriod: event.target.value as GoalPeriod,
                        })
                      }
                      className="goal-detail-form__select"
                      aria-label="Goal period"
                    >
                      {periodOrder.map((period) => (
                        <option key={period} value={period}>
                          {labelForPeriod(period)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="goal-detail-form__field goal-detail-form__field--full">
                    <span className="goal-detail-form__label">Metric</span>
                    <select
                      value={selectedGoal.goalMetricType}
                      onChange={(event) =>
                        onUpdateGoal(selectedGoal.id, {
                          goalMetricType: event.target.value as GoalMetricType,
                        })
                      }
                      className="goal-detail-form__select"
                      aria-label="Goal metric"
                    >
                      <option value="tasks_completed">Tasks completed</option>
                      <option value="inbox_items_processed">Inbox items processed</option>
                      <option value="journal_entries_written">Journal entries written</option>
                      <option value="notes_created">Notes created</option>
                    </select>
                  </label>
                  <label className="goal-detail-form__field">
                    <span className="goal-detail-form__label">Project</span>
                    <input
                      value={selectedGoal.project}
                      onChange={(event) =>
                        onUpdateGoal(selectedGoal.id, { project: event.target.value })
                      }
                      className="goal-detail-form__input"
                      aria-label="Goal project"
                    />
                  </label>
                  <label className="goal-detail-form__field">
                    <span className="goal-detail-form__label">Tag</span>
                    <input
                      value={selectedGoal.tags[0] ?? ""}
                      onChange={(event) =>
                        onUpdateGoal(selectedGoal.id, {
                          tags: event.target.value ? [event.target.value.replace(/^#/, "")] : [],
                        })
                      }
                      className="goal-detail-form__input"
                      aria-label="Goal tag"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function computeGoalProgress(goal: Item, items: Item[]) {
  if (goal.goalMetricType === "tasks_completed") {
    return items.filter((item) => {
      if (item.kind !== "task" || item.taskStatus !== "done") {
        return false;
      }

      if (goal.project && item.project !== goal.project) {
        return false;
      }

      if (goal.tags[0] && !item.tags.includes(goal.tags[0].replace(/^#/, ""))) {
        return false;
      }

      return true;
    }).length;
  }

  if (goal.goalMetricType === "inbox_items_processed") {
    return items.filter((item) => {
      if (
        item.sourceType !== "capture" ||
        item.state === "inbox" ||
        item.state === "someday" ||
        item.state === "deleted"
      ) {
        return false;
      }

      if (goal.project && item.project !== goal.project) {
        return false;
      }

      if (goal.tags[0] && !item.tags.includes(goal.tags[0].replace(/^#/, ""))) {
        return false;
      }

      return true;
    }).length;
  }

  return 0;
}

function labelForMetric(metricType: GoalMetricType) {
  switch (metricType) {
    case "inbox_items_processed":
      return "Inbox items processed";
    case "journal_entries_written":
      return "Journal entries written";
    case "notes_created":
      return "Notes created";
    default:
      return "Tasks completed";
  }
}

function labelForPeriod(period: GoalPeriod) {
  switch (period) {
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return "Daily";
  }
}
