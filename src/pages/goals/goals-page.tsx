import { useEffect, useState } from "react";
import { ArrowTurnIcon, EditIcon, TrashIcon } from "@/components/icons";
import { Card } from "@/components/data-display/card";
import { RightRailColumn } from "@/components/layout/right-rail-column";
import { ThreeColumnLayout } from "@/components/layout/three-column-layout";
import { ActionBar } from "@/components/actions/action-bar";
import { EmptyState } from "@/components/feedback/empty-state";
import { Modal } from "@/components/actions/modal";
import { PageShell } from "@/components/layout/page-shell";
import { useWindowWidth } from "@/lib/hooks/use-window-width";
import { resolveGoalProgress, resolveGoalProgressForDate } from "@/lib/domain/goal-progress";
import { getProjectName } from "@/lib/domain/project-relations";
import type { GoalPeriod, Item } from "@/models/workspace-item";
import type { JournalEntrySummary } from "@/models/journal";
import type { Project } from "@/models/project";

type GoalsPageProps = {
  items: Item[];
  projects: Project[];
  journalSummaries: JournalEntrySummary[];
  todayDate: string;
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Item>) => void;
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goalId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTaskForGoal: (goalId: string) => void;
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
  onEditGoal,
  onUpdateTask,
  onDeleteTask,
  onCreateTaskForGoal,
}: GoalsPageProps) {
  const windowWidth = useWindowWidth();
  const [activePeriod, setActivePeriod] = useState<GoalPeriod>("daily");
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const goals = items.filter((item) => item.kind === "goal" && item.state === "active");
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;
  const filteredGoals = goals.filter((goal) => goal.goalPeriod === activePeriod);
  const progressContext = {
    items,
    journalSummaries,
    todayDate,
  };
  const layoutMode = resolveGoalsLayoutMode(windowWidth);
  const showInlinePeriods = layoutMode !== "wide";
  const showStackedInsights = layoutMode === "narrow";
  const showRightRail = layoutMode !== "narrow";

  useEffect(() => {
    if (!selectedGoal) {
      return;
    }

    setActivePeriod(selectedGoal.goalPeriod);
  }, [selectedGoal]);

  return (
    <PageShell ariaLabel="Goals" className="page--goals">
      <ThreeColumnLayout
        className="goals-layout"
        leftClassName="goals-rail"
        centerClassName="goals-main"
        rightClassName="goals-insights"
        leftCollapsed={showInlinePeriods}
        rightCollapsed={!showRightRail}
        leftLabel="Goal periods"
        centerLabel="Goals"
        rightLabel="Goal insights"
        left={
          <>
            <div className="goals-rail__header">
              <p className="page__eyebrow">Filter</p>
            </div>
            <GoalPeriodFilters
              activePeriod={activePeriod}
              onSelectPeriod={setActivePeriod}
              className="goals-rail__list"
            />
          </>
        }
        center={
          filteredGoals.length > 0 ? (
              <div className="goals-main__section">
                <header className="goals-main__header">
                  <p className="page__eyebrow">Goals</p>
                  <h1 className="goals-main__title">{labelForPeriod(activePeriod)} goals</h1>
                  {showInlinePeriods ? (
                    <GoalPeriodFilters
                      activePeriod={activePeriod}
                      onSelectPeriod={setActivePeriod}
                      className="goals-periods goals-periods--inline"
                      testId="goals-inline-periods"
                    />
                  ) : null}
                </header>
                <div className="goals-main__cards">
                  {filteredGoals.map((goal) => {
                    const progress = resolveGoalProgress(goal, progressContext);
                    const progressByDate = goal.goalProgressByDate ?? {};
                    const directCompletion = resolveGoalProgressForDate(goal, progressContext, todayDate);
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
                          <div className="goal-card__copy">
                            <h2 className="goal-card__title">{goal.title}</h2>
                            {goal.content.trim() ? (
                              <p className="goal-card__description">{goal.content}</p>
                            ) : null}
                            <p className="goal-card__meta">
                              {projectName}
                              {` • ${formatMetricLabel(goal.goalMetric)}`}
                            </p>
                          </div>
                          <p className="goal-card__progress">
                            {progress.completedCount} / {progress.progressDenominator}
                          </p>
                        </div>
                        {progress.linkedTasks.length > 0 ? (
                          <div className="goal-card__linked-tasks">
                            {progress.linkedTasks.map((task) => (
                              <div key={task.id} className="goal-card__linked-task">
                                <label className="goal-card__linked-task-main">
                                  <input
                                    type="checkbox"
                                    checked={task.isCompleted}
                                    aria-label={`Complete ${task.title}`}
                                    onChange={(event) => {
                                      event.stopPropagation();
                                      onUpdateTask(task.id, {
                                        isCompleted: event.target.checked,
                                      });
                                    }}
                                  />
                                  <span className="goal-card__linked-task-mark" aria-hidden="true" />
                                  <span className="goal-card__linked-task-title">{task.title}</span>
                                </label>
                                <button
                                  type="button"
                                  className="goal-card__delete"
                                  aria-label={`Unlink ${task.title}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onUpdateGoal(goal.id, {
                                      goalScope: {
                                        ...goal.goalScope,
                                        taskIds: (goal.goalScope?.taskIds ?? []).filter(
                                          (taskId) => taskId !== task.id,
                                        ),
                                      },
                                    });
                                  }}
                                >
                                  <ArrowTurnIcon className="goal-card__delete-icon" />
                                </button>
                                <button
                                  type="button"
                                  className="goal-card__delete"
                                  aria-label={`Delete ${task.title}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                >
                                  <TrashIcon className="goal-card__delete-icon" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : progress.isDirectCompletion ? (
                          <div className="goal-card__checklist" aria-label={`${goal.title} completion`}>
                            <button
                              type="button"
                              className={`goal-card__checkbox ${directCompletion > 0 ? "is-checked" : ""}`}
                              aria-pressed={directCompletion > 0}
                              aria-label={`${directCompletion > 0 ? "Mark" : "Mark"} ${goal.title} complete`}
                              onClick={(event) => {
                                event.stopPropagation();
                                const nextProgress = directCompletion > 0 ? 0 : 1;
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
                            aria-label={`Edit ${goal.title}`}
                            onClick={() => onEditGoal(goal.id)}
                          >
                            <EditIcon className="goal-card__delete-icon" />
                          </button>
                          {goal.goalMetric === "tasks_completed" ? (
                            <button
                              type="button"
                              className="goal-card__delete"
                              aria-label={`Add task to ${goal.title}`}
                              onClick={() => onCreateTaskForGoal(goal.id)}
                            >
                              +
                            </button>
                          ) : null}
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
              <div className="goals-empty-shell" data-testid="goals-empty-shell">
                <div className="goals-empty-state">
                  {showInlinePeriods ? (
                    <GoalPeriodFilters
                      activePeriod={activePeriod}
                      onSelectPeriod={setActivePeriod}
                      className="goals-periods goals-periods--inline"
                      testId="goals-inline-periods"
                    />
                  ) : null}
                  <EmptyState
                    className="goals-empty"
                    badge="Goals"
                    title={`No ${activePeriod} goals yet`}
                    copy="Create a goal to give this period a target."
                  />
                </div>
              </div>
            )
        }
        right={
          <RightRailColumn items={items} journalSummaries={journalSummaries} todayDate={todayDate} />
        }
      />

      {showStackedInsights ? (
        <section
          className="goals-stacked-insights"
          aria-label="Goal insights"
          data-testid="goals-stacked-insights"
        >
          <RightRailColumn items={items} journalSummaries={journalSummaries} todayDate={todayDate} />
        </section>
      ) : null}

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
    </PageShell>
  );
}

function GoalPeriodFilters({
  activePeriod,
  onSelectPeriod,
  className,
  testId,
}: {
  activePeriod: GoalPeriod;
  onSelectPeriod: (period: GoalPeriod) => void;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={className}
      role="tablist"
      aria-label="Goal periods"
      data-testid={testId}
    >
      {periodOptions.map((period) => (
        <button
          key={period.id}
          type="button"
          className={`goals-rail__item ${activePeriod === period.id ? "is-active" : ""}`}
          onClick={() => onSelectPeriod(period.id)}
        >
          <span className="goals-rail__name">{period.label}</span>
        </button>
      ))}
    </div>
  );
}

function resolveGoalsLayoutMode(windowWidth: number): "wide" | "medium" | "narrow" {
  if (windowWidth < 900) {
    return "narrow";
  }

  if (windowWidth < 1280) {
    return "medium";
  }

  return "wide";
}

function labelForPeriod(period: GoalPeriod) {
  return period.slice(0, 1).toUpperCase() + period.slice(1);
}

function formatMetricLabel(metric: Item["goalMetric"]) {
  switch (metric) {
    case "tasks_completed":
      return "Tasks";
    default:
      return "Direct";
  }
}

function automaticGoalDescription(goal: Item) {
  switch (goal.goalMetric) {
    case "tasks_completed":
      return "Progress updates from completed tasks in the current period.";
    default:
      return "Mark this goal complete when you achieve it for the current period.";
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
    <Modal ariaLabelledBy="goal-delete-confirm-title" className="inbox-confirm" onClose={onClose}>
      <div className="inbox-confirm__content">
        <p id="goal-delete-confirm-title" className="new-task__title">
          Delete goal
        </p>
        <p className="inbox-confirm__item">{goalTitle}</p>
        <p className="inbox-confirm__copy">This will permanently remove the goal.</p>
        <ActionBar className="inbox-confirm__actions">
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
        </ActionBar>
      </div>
    </Modal>
  );
}
