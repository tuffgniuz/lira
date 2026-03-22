import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ActionBar } from "@/components/actions/action-bar";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";
import { Stack } from "@/components/layout/stack";
import type { GoalMetric, GoalPeriod } from "@/models/workspace-item";
import { inferGoalDraft } from "./goal-draft";

const metricOptions: Array<{ id: GoalMetric | "none"; label: string }> = [
  { id: "none", label: "No metric" },
  { id: "tasks_completed", label: "Tasks" },
];

const periodOptions: Array<{ id: GoalPeriod; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

type GoalDraftSubmit = {
  title: string;
  description: string;
  target: number;
  period: GoalPeriod;
  metric?: GoalMetric;
  projectId: string;
};

type InitialGoalDraft = GoalDraftSubmit;

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
  const [metricOverride, setMetricOverride] = useState<GoalMetric | "none" | null>(null);
  const [targetOverride, setTargetOverride] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setGoalSentence("");
      setProjectIdOverride(null);
      setPeriodOverride(null);
      setMetricOverride(null);
      setTargetOverride("");
      return;
    }

    if (initialGoal) {
      setGoalSentence(initialGoal.title);
      setProjectIdOverride(initialGoal.projectId);
      setPeriodOverride(initialGoal.period);
      setMetricOverride(initialGoal.metric ?? "none");
      setTargetOverride(initialGoal.metric === "tasks_completed" ? String(initialGoal.target) : "");
      return;
    }

    setGoalSentence("");
    setProjectIdOverride(null);
    setPeriodOverride(null);
    setMetricOverride(null);
    setTargetOverride("");
  }, [initialGoal, isOpen]);

  if (!isOpen) {
    return null;
  }

  const inferredDraft = inferGoalDraft(goalSentence, projects);
  const resolvedPeriod = periodOverride ?? inferredDraft.period;
  const resolvedProjectId = projectIdOverride ?? inferredDraft.projectId;
  const resolvedMetric = resolveMetric(metricOverride, inferredDraft.metric);
  const resolvedTarget = resolveTargetValue(
    targetOverride,
    resolvedMetric === "tasks_completed" ? inferredDraft.target : 1,
  );
  const canSubmit = inferredDraft.title.trim().length > 0;
  const isEditing = Boolean(initialGoal);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit({
      title: inferredDraft.title,
      description: "",
      target: resolvedTarget,
      period: resolvedPeriod,
      metric: resolvedMetric,
      projectId: resolvedProjectId,
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
            <p className="new-goal__section-label">Metric</p>
            <div className="new-goal__choice-row" aria-label="Metric options">
              {metricOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`new-goal__choice ${
                    (resolvedMetric ?? "none") === option.id ? "is-active" : ""
                  }`}
                  onClick={() => setMetricOverride(option.id)}
                  aria-pressed={(resolvedMetric ?? "none") === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {resolvedMetric === "tasks_completed" ? (
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
                  onClick={() => setPeriodOverride(option.id)}
                  aria-pressed={resolvedPeriod === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

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

function resolveMetric(
  metricOverride: GoalMetric | "none" | null,
  inferredMetric?: GoalMetric,
): GoalMetric | undefined {
  if (metricOverride === "none") {
    return undefined;
  }

  if (metricOverride === "tasks_completed") {
    return "tasks_completed";
  }

  return inferredMetric;
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
