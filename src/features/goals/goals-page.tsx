import { useState } from "react";
import { TrashIcon } from "../../app/icons";
import { Card } from "../../components/card";
import { FloatingPanel } from "../../components/floating-panel";
import { RightRailColumn } from "../../components/right-rail-column";
import { ThreeColumnLayout } from "../../components/three-column-layout";
import { resolveGoalProgress, resolveGoalProgressForDate } from "../../lib/domain/goal-progress";
import { getProjectName } from "../../lib/domain/project-relations";
import type { GoalPeriod, Item } from "../../models/item";
import type { JournalEntrySummary } from "../../models/journal";
import type { Project } from "../../models/project";

type GoalsPageProps = {
  items: Item[];
  projects: Project[];
  journalSummaries: JournalEntrySummary[];
  todayDate: string;
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Item>) => void;
  onDeleteGoal: (goalId: string) => void;
};

const periodOptions: Array<{ id: GoalPeriod; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export function GoalsPage({
  items,
  projects,
  journalSummaries,
  todayDate,
  selectedGoalId,
  onSelectGoal,
  onUpdateGoal,
  onDeleteGoal,
}: GoalsPageProps) {
  const [activePeriod, setActivePeriod] = useState<GoalPeriod>("daily");
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const goals = items.filter((item) => item.kind === "goal" && item.state === "active");
  const filteredGoals = goals.filter((goal) => goal.goalPeriod === activePeriod);
  const progressContext = {
    items,
    journalSummaries,
    todayDate,
  };

  return (
    <section className="page page--goals" aria-label="Goals">
      <ThreeColumnLayout
        className="goals-layout"
        leftClassName="goals-rail"
        centerClassName="goals-main"
        rightClassName="goals-insights"
        leftLabel="Goal periods"
        centerLabel="Goals"
        rightLabel="Goal insights"
        left={
          <>
            <div className="goals-rail__header">
              <p className="page__eyebrow">Filter</p>
            </div>
            <div className="goals-rail__list">
              {periodOptions.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  className={`goals-rail__item ${activePeriod === period.id ? "is-active" : ""}`}
                  onClick={() => setActivePeriod(period.id)}
                >
                  <span className="goals-rail__name">{period.label}</span>
                </button>
              ))}
            </div>
          </>
        }
        center={
          filteredGoals.length > 0 ? (
              <div className="goals-main__section">
                <header className="goals-main__header">
                  <p className="page__eyebrow">Goals</p>
                  <h1 className="goals-main__title">{labelForPeriod(activePeriod)} goals</h1>
                </header>
                <div className="goals-main__cards">
                  {filteredGoals.map((goal) => {
                    const progress = resolveGoalProgress(goal, progressContext);
                    const progressByDate = goal.goalProgressByDate ?? {};
                    const manualProgress = resolveGoalProgressForDate(goal, progressContext, todayDate);
                    const projectName = getProjectName(
                      projects,
                      goal.goalScope?.projectId,
                      "No linked project yet",
                    );

                    return (
                      <Card
                        as="article"
                        key={goal.id}
                        className={`goal-card ${selectedGoalId === goal.id ? "is-active" : ""}`}
                        interactive
                        onClick={() => onSelectGoal(goal.id)}
                      >
                        <div className="goal-card__header">
                          <div>
                            <h2 className="goal-card__title">{goal.title}</h2>
                            {goal.content.trim() ? (
                              <p className="goal-card__description">{goal.content}</p>
                            ) : null}
                            <p className="goal-card__meta">
                              {projectName}
                              {goal.goalTrackingMode === "automatic"
                                ? ` • ${formatMetricLabel(goal.goalMetric)}`
                                : " • Manual"}
                            </p>
                          </div>
                          <p className="goal-card__progress">
                            {progress.completedCount} / {progress.progressDenominator}
                          </p>
                        </div>
                        {progress.linkedTasks.length > 0 ? (
                          <div className="goal-card__linked-tasks">
                            {progress.linkedTasks.map((task) => (
                              <label key={task.id} className="goal-card__linked-task">
                                <input
                                  type="checkbox"
                                  checked={task.taskStatus === "done"}
                                  readOnly
                                />
                                <span>{task.title}</span>
                              </label>
                            ))}
                          </div>
                        ) : progress.isManual ? (
                          <div className="goal-card__checklist" aria-label={`${goal.title} progress`}>
                            {Array.from({ length: goal.goalTarget }, (_, index) => {
                              const checked = index < manualProgress;

                              return (
                                <button
                                  key={`${goal.id}-${index}`}
                                  type="button"
                                  className={`goal-card__checkbox ${checked ? "is-checked" : ""}`}
                                  aria-pressed={checked}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const nextProgress = checked ? index : index + 1;
                                    onUpdateGoal(goal.id, {
                                      goalProgress: nextProgress,
                                      goalProgressByDate: {
                                        ...progressByDate,
                                        [todayDate]: nextProgress,
                                      },
                                    });
                                  }}
                                >
                                  <span className="goal-card__checkbox-mark" />
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="goal-card__linked-tasks" aria-label={`${goal.title} source`}>
                            <p className="goal-card__description">
                              {automaticGoalDescription(goal)}
                            </p>
                          </div>
                        )}
                        <div className="goal-card__progress-bar" aria-hidden="true">
                          <div
                            className="goal-card__progress-fill"
                            style={{ width: `${progress.progressPercent}%` }}
                          />
                        </div>
                        <div className="goal-card__actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="goal-card__delete"
                            aria-label={`Delete ${goal.title}`}
                            onClick={() => setPendingDeleteGoal({ id: goal.id, title: goal.title })}
                          >
                            <TrashIcon className="goal-card__delete-icon" />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="goals-empty">
                <div className="goals-empty__art" aria-hidden="true">
                  <svg viewBox="0 0 180 180" className="goals-empty__svg">
                    <defs>
                      <linearGradient id="goals-empty-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="var(--color-focus-ring)" stopOpacity="0.75" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="90"
                      cy="90"
                      r="68"
                      fill="url(#goals-empty-gradient)"
                      opacity="0.12"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r="34"
                      fill="none"
                      stroke="var(--color-border-strong)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r="16"
                      fill="none"
                      stroke="var(--color-text-secondary)"
                      strokeWidth="4"
                    />
                    <path
                      d="M90 42v18M90 120v18M42 90h18M120 90h18"
                      fill="none"
                      stroke="var(--color-text-muted)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <circle cx="132" cy="56" r="12" fill="var(--color-panel-bg)" />
                    <path
                      d="M132 50v12M126 56h12"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <header className="goals-main__header">
                  <p className="page__eyebrow">Goals</p>
                  <h1 className="goals-main__title">{labelForPeriod(activePeriod)} goals</h1>
                </header>
                <p className="goals-empty__title">No {activePeriod} goals yet</p>
                <p className="goals-empty__copy">Create a goal to give this period a target.</p>
              </div>
            )
        }
        right={
          <RightRailColumn items={items} journalSummaries={journalSummaries} todayDate={todayDate} />
        }
      />

      {pendingDeleteGoal ? (
        <GoalDeleteConfirmModal
          goalTitle={pendingDeleteGoal.title}
          onClose={() => setPendingDeleteGoal(null)}
          onConfirm={() => {
            onDeleteGoal(pendingDeleteGoal.id);
            setPendingDeleteGoal(null);
          }}
        />
      ) : null}
    </section>
  );
}

function labelForPeriod(period: GoalPeriod) {
  return period.slice(0, 1).toUpperCase() + period.slice(1);
}

function formatMetricLabel(metric: Item["goalMetric"]) {
  switch (metric) {
    case "tasks_completed":
      return "Tasks";
    case "journal_entries_written":
      return "Journal";
    case "manual_units":
      return "Manual";
    default:
      return "Automatic";
  }
}

function automaticGoalDescription(goal: Item) {
  switch (goal.goalMetric) {
    case "tasks_completed":
      return "Progress updates from completed tasks in the current period.";
    case "journal_entries_written":
      return "Progress updates from journal entries written in the current period.";
    default:
      return "Progress updates automatically from activity in the current period.";
  }
}

function GoalDeleteConfirmModal({
  goalTitle,
  onClose,
  onConfirm,
}: {
  goalTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <FloatingPanel
      ariaLabelledBy="goal-delete-confirm-title"
      className="inbox-confirm"
      onClose={onClose}
    >
      <div className="inbox-confirm__content">
        <p id="goal-delete-confirm-title" className="new-task__title">
          Delete goal
        </p>
        <p className="inbox-confirm__item">{goalTitle}</p>
        <p className="inbox-confirm__copy">This will permanently remove the goal.</p>
        <div className="inbox-confirm__actions">
          <button type="button" className="inbox-confirm__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="inbox-confirm__button inbox-confirm__button--confirm"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
