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
import {
  formatGoalMetricLabel,
  getCurrentGoalWeekDays,
  resolveGoalWeekDayStatus,
} from "@/lib/domain/goal-display";
import { getProjectName } from "@/lib/domain/project-relations";
import type { GoalPeriod, Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";

type GoalsPageProps = {
  items: Item[];
  projects: Project[];
  todayDate: string;
  selectedGoalId: string;
  onSelectGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Item>) => void;
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goalId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onNotify: (message: string) => void;
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
  todayDate,
  selectedGoalId,
  onSelectGoal,
  onUpdateGoal,
  onDeleteGoal,
  onEditGoal,
  onUpdateTask,
  onDeleteTask,
  onNotify,
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
                              {` • ${formatGoalMetricLabel(goal)}`}
                            </p>
                          </div>
	                          <p className="goal-card__progress">
	                            {progress.completedCount} / {progress.progressDenominator}
	                          </p>
	                        </div>
	                        {goal.goalPeriod === "daily" ? (
	                          <GoalDailyWeekStrip
	                            goal={goal}
	                            todayDate={todayDate}
	                            progressContext={progressContext}
	                          />
	                        ) : null}
	                        {progress.isOffDay ? null : progress.linkedTasks.length > 0 ? (
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
                                    onNotify(`Task "${task.title}" deleted`);
                                  }}
                                >
                                  <TrashIcon className="goal-card__delete-icon" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : goal.goalMilestones?.length ? (
                          <div className="goal-card__linked-tasks" aria-label={`${goal.title} milestones`}>
                            {goal.goalMilestones.map((milestone) => (
                              <label key={milestone.id} className="goal-card__linked-task-main goal-card__milestone">
                                <input
                                  type="checkbox"
                                  checked={milestone.isCompleted}
                                  aria-label={`Complete milestone ${milestone.title}`}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    const nextMilestones = (goal.goalMilestones ?? []).map((candidate) =>
                                      candidate.id === milestone.id
                                        ? {
                                            ...candidate,
                                            isCompleted: event.target.checked,
                                            completedAt: event.target.checked ? todayDate : "",
                                          }
                                        : candidate,
                                    );
                                    onUpdateGoal(goal.id, {
                                      goalMilestones: nextMilestones,
                                      goalProgress: nextMilestones.filter((candidate) => candidate.isCompleted).length,
                                    });
                                  }}
                                />
                                <span className="goal-card__linked-task-mark" aria-hidden="true" />
                                <span className="goal-card__linked-task-title">{milestone.title}</span>
                              </label>
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
          <RightRailColumn items={items} todayDate={todayDate} />
        }
      />

      {showStackedInsights ? (
        <section
          className="goals-stacked-insights"
          aria-label="Goal insights"
          data-testid="goals-stacked-insights"
        >
          <RightRailColumn items={items} todayDate={todayDate} />
        </section>
      ) : null}

      {pendingDeleteGoal ? (
        <GoalDeleteConfirmModal
          goalTitle={pendingDeleteGoal.title}
          onClose={() => setPendingDeleteGoal(null)}
          onConfirm={() => {
            onDeleteGoal(pendingDeleteGoal.id);
            setPendingDeleteGoal(null);
            onNotify(`Goal "${pendingDeleteGoal.title}" deleted`);
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

function GoalDailyWeekStrip({
	goal,
	todayDate,
	progressContext,
}: {
	goal: Item;
	todayDate: string;
	progressContext: {
		items: Item[];
		todayDate: string;
	};
}) {
	const weekDays = getCurrentGoalWeekDays(todayDate);

	return (
		<div className="goal-card__week-strip" aria-label={`${goal.title} week status`}>
			<div className="goal-card__week-grid">
				{weekDays.map((day) => (
					<span key={`${day.date}-label`} className="goal-card__week-label">
						{day.shortLabel}
					</span>
				))}
				{weekDays.map((day) => {
					const status = resolveGoalWeekDayStatus(goal, progressContext, day.date, todayDate);
					return (
						<span
							key={`${day.date}-status`}
							className={`goal-card__week-status is-${status.kind}`}
							aria-label={`${day.label} status: ${status.label}`}
						>
							{status.symbol}
						</span>
					);
				})}
			</div>
		</div>
	);
}

function automaticGoalDescription(goal: Item) {
  if (goal.goalMilestones?.length) {
    return "Complete the milestones to finish this goal.";
  }

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
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm]);

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
