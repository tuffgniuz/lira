import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ActionBar } from "@/components/actions/action-bar";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";
import { Stack } from "@/components/layout/stack";
import type {
  GoalMetric,
  GoalMilestone,
  GoalPeriod,
  GoalScheduleDay,
} from "@/models/workspace-item";
import { inferGoalDraft } from "./goal-draft";

const trackingOptions = [
  { id: "direct", label: "No metric" },
  { id: "tasks", label: "Tasks" },
] as const;

const periodOptions: Array<{ id: GoalPeriod; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

const weekdayOptions: Array<{ id: GoalScheduleDay; label: string; shortLabel: string }> = [
  { id: "monday", label: "Monday", shortLabel: "Mon" },
  { id: "tuesday", label: "Tuesday", shortLabel: "Tue" },
  { id: "wednesday", label: "Wednesday", shortLabel: "Wed" },
  { id: "thursday", label: "Thursday", shortLabel: "Thu" },
  { id: "friday", label: "Friday", shortLabel: "Fri" },
  { id: "saturday", label: "Saturday", shortLabel: "Sat" },
  { id: "sunday", label: "Sunday", shortLabel: "Sun" },
];

type GoalTrackingChoice = "direct" | "tasks" | "milestones";

type GoalDraftSubmit = {
  title: string;
  description: string;
  target: number;
  period: GoalPeriod;
  metric?: GoalMetric;
  projectId: string;
  scheduleDays: GoalScheduleDay[];
  milestones: GoalMilestone[];
};

type InitialGoalDraft = Omit<GoalDraftSubmit, "scheduleDays" | "milestones"> & {
  scheduleDays?: GoalScheduleDay[];
  milestones?: GoalMilestone[];
};

export function NewGoalModal({
  isOpen,
  onClose,
  projects,
  initialGoal,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  initialGoal?: InitialGoalDraft;
  onSubmit: (goal: GoalDraftSubmit) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [goalSentence, setGoalSentence] = useState("");
  const [projectIdOverride, setProjectIdOverride] = useState<string | null>(null);
  const [periodOverride, setPeriodOverride] = useState<GoalPeriod | null>(null);
  const [trackingOverride, setTrackingOverride] = useState<GoalTrackingChoice | null>(null);
  const [targetOverride, setTargetOverride] = useState<string>("");
  const [scheduleDaysOverride, setScheduleDaysOverride] = useState<GoalScheduleDay[] | null>(null);
  const [milestoneDrafts, setMilestoneDrafts] = useState<GoalMilestone[]>([]);

  useEffect(() => {
    if (!isOpen) {
      resetDraft();
      return;
    }

    if (initialGoal) {
      setGoalSentence(initialGoal.title);
      setProjectIdOverride(initialGoal.projectId);
      setPeriodOverride(initialGoal.period);
      setTrackingOverride(resolveInitialTracking(initialGoal));
      setTargetOverride(initialGoal.metric === "tasks_completed" ? String(initialGoal.target) : "");
      setScheduleDaysOverride(initialGoal.scheduleDays ?? []);
      setMilestoneDrafts(
        initialGoal.milestones?.length ? initialGoal.milestones : [createMilestoneDraft()],
      );
      return;
    }

    resetDraft();
  }, [initialGoal, isOpen]);

  if (!isOpen) {
    return null;
  }

  const inferredDraft = inferGoalDraft(goalSentence, projects);
  const resolvedPeriod = periodOverride ?? inferredDraft.period;
  const resolvedProjectId = projectIdOverride ?? inferredDraft.projectId;
  const resolvedTracking = resolveTracking(
    trackingOverride,
    initialGoal,
    inferredDraft.metric,
    resolvedPeriod,
  );
  const resolvedMetric = resolvedTracking === "tasks" ? "tasks_completed" : undefined;
  const resolvedTarget = resolveTargetValue(
    targetOverride,
    resolvedMetric === "tasks_completed" ? inferredDraft.target : 1,
  );
  const resolvedScheduleDays =
    resolvedPeriod === "daily"
      ? (scheduleDaysOverride ?? weekdayOptions.map((day) => day.id))
      : [];
  const normalizedMilestones = normalizeMilestones(milestoneDrafts);
  const canSubmit =
    inferredDraft.title.trim().length > 0 &&
    (resolvedTracking !== "milestones" || normalizedMilestones.length > 0);
  const isEditing = Boolean(initialGoal);
  const canUseMilestones = resolvedPeriod === "weekly" || resolvedPeriod === "monthly";

  function resetDraft() {
    setGoalSentence("");
    setProjectIdOverride(null);
    setPeriodOverride(null);
    setTrackingOverride(null);
    setTargetOverride("");
    setScheduleDaysOverride(null);
    setMilestoneDrafts([createMilestoneDraft()]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit({
      title: inferredDraft.title,
      description: "",
      target:
        resolvedTracking === "milestones" ? Math.max(1, normalizedMilestones.length) : resolvedTarget,
      period: resolvedPeriod,
      metric: resolvedMetric,
      projectId: resolvedProjectId,
      scheduleDays: resolvedScheduleDays,
      milestones: resolvedTracking === "milestones" ? normalizedMilestones : [],
    });
  }

  return (
    <Modal ariaLabelledBy="new-goal-title" className="new-goal" onClose={onClose}>
      <form
        ref={formRef}
        className="new-goal__form"
        onSubmit={handleSubmit}
        onKeyDownCapture={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
      >
        <Stack className="new-goal__body">
          <header className="new-goal__header">
            <h2 id="new-goal-title" className="new-goal__title">
              {isEditing ? "Edit Goal" : "New Goal"}
            </h2>
            <p className="new-goal__copy">What do you want to accomplish?</p>
          </header>

          <FormField className="new-goal__sentence-field">
            <input
              value={goalSentence}
              onChange={(event) => setGoalSentence(event.target.value)}
              className="new-goal__sentence-input"
              aria-label="Goal sentence"
              placeholder="Describe the goal"
              autoFocus
            />
          </FormField>

          <div className="new-goal__section">
            <p className="new-goal__section-label">Track by</p>
            <div className="new-goal__choice-row" aria-label="Tracking options">
              {trackingOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`new-goal__choice ${resolvedTracking === option.id ? "is-active" : ""}`}
                  onClick={() => setTrackingOverride(option.id)}
                  aria-pressed={resolvedTracking === option.id}
                >
                  {option.label}
                </button>
              ))}
              {canUseMilestones ? (
                <button
                  type="button"
                  className={`new-goal__choice ${resolvedTracking === "milestones" ? "is-active" : ""}`}
                  onClick={() => setTrackingOverride("milestones")}
                  aria-pressed={resolvedTracking === "milestones"}
                >
                  Milestones
                </button>
              ) : null}
            </div>
          </div>

          {resolvedTracking === "tasks" ? (
            <div className="new-goal__section">
              <p className="new-goal__section-label">Tasks needed</p>
              <input
                value={targetOverride}
                onChange={(event) => setTargetOverride(event.target.value)}
                className="new-goal__target-input"
                aria-label="Goal target"
                type="number"
                min="1"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={String(inferredDraft.target)}
              />
            </div>
          ) : null}

          <div className="new-goal__section">
            <p className="new-goal__section-label">Period</p>
            <div className="new-goal__choice-row" aria-label="Period options">
              {periodOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`new-goal__choice ${resolvedPeriod === option.id ? "is-active" : ""}`}
                  onClick={() => {
                    setPeriodOverride(option.id);

                    if (option.id === "daily") {
                      setMilestoneDrafts((current) =>
                        current.length ? current : [createMilestoneDraft()],
                      );
                      if (resolvedTracking === "milestones") {
                        setTrackingOverride("direct");
                      }
                    }
                  }}
                  aria-pressed={resolvedPeriod === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {resolvedPeriod === "daily" ? (
            <div className="new-goal__section">
              <p className="new-goal__section-label">Track on</p>
              <div className="new-goal__weekday-grid" aria-label="Goal weekdays">
                {weekdayOptions.map((day) => {
                  const checked = resolvedScheduleDays.includes(day.id);

                  return (
                    <label key={day.id} className="new-goal__weekday">
                      <input
                        type="checkbox"
                        className="new-goal__weekday-input"
                        aria-label={day.label}
                        checked={checked}
                        onChange={(event) => {
                          setScheduleDaysOverride((current) => {
                            const currentDays = current ?? weekdayOptions.map((weekday) => weekday.id);

                            if (event.target.checked) {
                              return weekdayOptions
                                .map((weekday) => weekday.id)
                                .filter((weekday) =>
                                  weekday === day.id || currentDays.includes(weekday),
                                );
                            }

                            return currentDays.filter((weekday) => weekday !== day.id);
                          });
                        }}
                      />
                      <span className={`new-goal__weekday-chip ${checked ? "is-checked" : ""}`}>
                        {day.shortLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {resolvedTracking === "milestones" ? (
            <div className="new-goal__section">
              <p className="new-goal__section-label">Milestones</p>
              <div className="new-goal__milestones">
                {milestoneDrafts.map((milestone, index) => (
                  <div key={milestone.id} className="new-goal__milestone-row">
                    <input
                      value={milestone.title}
                      onChange={(event) =>
                        setMilestoneDrafts((current) =>
                          current.map((candidate) =>
                            candidate.id === milestone.id
                              ? { ...candidate, title: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                      className="new-goal__target-input"
                      aria-label={`Milestone ${index + 1}`}
                      placeholder="Add milestone"
                    />
                    <button
                      type="button"
                      className="new-goal__choice"
                      onClick={() =>
                        setMilestoneDrafts((current) =>
                          current.length > 1
                            ? current.filter((candidate) => candidate.id !== milestone.id)
                            : [createMilestoneDraft()],
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="new-goal__choice new-goal__milestone-add"
                onClick={() =>
                  setMilestoneDrafts((current) => [...current, createMilestoneDraft()])
                }
              >
                Add milestone
              </button>
            </div>
          ) : null}

          <div className="new-goal__section">
            <p className="new-goal__section-label">Project</p>
            <div className="new-goal__choice-row" aria-label="Project options">
              <button
                type="button"
                className={`new-goal__choice new-goal__project-choice ${
                  resolvedProjectId === "" ? "is-active" : ""
                }`}
                onClick={() => setProjectIdOverride("")}
                aria-pressed={resolvedProjectId === ""}
              >
                No project
              </button>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`new-goal__choice new-goal__project-choice ${
                    resolvedProjectId === project.id ? "is-active" : ""
                  }`}
                  onClick={() => setProjectIdOverride(project.id)}
                  aria-pressed={resolvedProjectId === project.id}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>
        </Stack>

        <ActionBar className="new-goal__actions">
          <button type="submit" className="new-goal__create" disabled={!canSubmit}>
            {isEditing ? "Save" : "Create"}
          </button>
        </ActionBar>
      </form>
    </Modal>
  );
}

function resolveTracking(
  trackingOverride: GoalTrackingChoice | null,
  initialGoal: InitialGoalDraft | undefined,
  inferredMetric: GoalMetric | undefined,
  period: GoalPeriod,
): GoalTrackingChoice {
  const baseTracking = trackingOverride ?? resolveInitialTracking(initialGoal, inferredMetric);

  if (period === "daily" && baseTracking === "milestones") {
    return "direct";
  }

  return baseTracking;
}

function resolveInitialTracking(
  initialGoal?: Pick<GoalDraftSubmit, "metric" | "milestones">,
  inferredMetric?: GoalMetric,
): GoalTrackingChoice {
  if (initialGoal?.milestones?.length) {
    return "milestones";
  }

  if (initialGoal?.metric === "tasks_completed" || inferredMetric === "tasks_completed") {
    return "tasks";
  }

  return "direct";
}

function resolveTargetValue(targetOverride: string, inferredTarget: number) {
  const trimmed = targetOverride.trim();

  if (!trimmed) {
    return inferredTarget;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return inferredTarget;
  }

  return parsed;
}

function createMilestoneDraft(): GoalMilestone {
  return {
    id: `goal-milestone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    isCompleted: false,
    completedAt: "",
  };
}

function normalizeMilestones(milestones: GoalMilestone[]) {
  return milestones
    .map((milestone, index) => ({
      ...milestone,
      title: milestone.title.trim(),
      isCompleted: Boolean(milestone.isCompleted),
      completedAt: milestone.completedAt ?? "",
      sortOrder: index,
    }))
    .filter((milestone) => milestone.title.length > 0)
    .map(({ sortOrder: _sortOrder, ...milestone }) => milestone);
}
