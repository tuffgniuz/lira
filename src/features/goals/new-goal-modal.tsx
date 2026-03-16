import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FloatingPanel } from "../../components/floating-panel";
import type { GoalMetric, GoalPeriod, GoalTrackingMode } from "../../models/item";

const periodOptions: Array<{ id: GoalPeriod; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

const automaticMetricOptions: Array<{ id: GoalMetric; label: string }> = [
  { id: "tasks_completed", label: "Tasks completed" },
  { id: "journal_entries_written", label: "Journal entries written" },
];

export function NewGoalModal({
  isOpen,
  onClose,
  projects,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  onSubmit: (goal: {
    title: string;
    description: string;
    target: number;
    period: GoalPeriod;
    trackingMode: GoalTrackingMode;
    metric: GoalMetric;
    projectId: string;
  }) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("1");
  const [period, setPeriod] = useState<GoalPeriod>("daily");
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>("automatic");
  const [metric, setMetric] = useState<GoalMetric>("tasks_completed");
  const [projectId, setProjectId] = useState("");

  const parsedTarget = Number.parseInt(targetValue, 10);
  const safeTarget = Number.isNaN(parsedTarget) || parsedTarget <= 0 ? 1 : parsedTarget;
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const generatedTitle = buildGoalSummary(safeTarget, period, selectedProject?.name ?? "");
  const previewTitle = title.trim() || generatedTitle;

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setTitleTouched(false);
      setDescription("");
      setTargetValue("1");
      setPeriod("daily");
      setTrackingMode("automatic");
      setMetric("tasks_completed");
      setProjectId("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!titleTouched) {
      setTitle(generatedTitle);
    }
  }, [generatedTitle, titleTouched]);

  if (!isOpen) {
    return null;
  }

  function submitGoal() {
    const resolvedTitle = title.trim() || generatedTitle.trim();

    if (!resolvedTitle) {
      return;
    }

    onSubmit({
      title: resolvedTitle,
      description: description.trim(),
      target: safeTarget,
      period,
      trackingMode,
      metric,
      projectId,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitGoal();
  }

  return (
    <FloatingPanel ariaLabelledBy="new-goal-title" className="new-goal" onClose={onClose}>
      <form
        ref={formRef}
        className="new-goal__form"
        onSubmit={handleSubmit}
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          if (event.target instanceof HTMLTextAreaElement) {
            if (event.metaKey || event.ctrlKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }

            return;
          }

          event.preventDefault();
          formRef.current?.requestSubmit();
        }}
      >
        <header className="new-goal__header">
          <h2 id="new-goal-title" className="new-goal__title">
            New Goal
          </h2>
          <p className="new-goal__copy">Define a measurable goal for your workflow</p>
        </header>

        <section className="new-goal__section">
          <div className="new-goal__section-header">
            <p className="new-goal__section-title">How should progress be tracked?</p>
          </div>
          <div className="new-goal__tracking-options" role="radiogroup" aria-label="Goal tracking mode">
            <button
              type="button"
              className={`new-goal__tracking-option ${
                trackingMode === "automatic" ? "is-active" : ""
              }`}
              onClick={() => setTrackingMode("automatic")}
              aria-pressed={trackingMode === "automatic"}
            >
              <span className="new-goal__tracking-option-title">Automatically from activity</span>
              <span className="new-goal__tracking-option-copy">
                Progress updates from completed tasks or journal entries.
              </span>
            </button>
            <button
              type="button"
              className={`new-goal__tracking-option ${
                trackingMode === "manual" ? "is-active" : ""
              }`}
              onClick={() => {
                setTrackingMode("manual");
                setMetric("manual_units");
              }}
              aria-pressed={trackingMode === "manual"}
            >
              <span className="new-goal__tracking-option-title">Manually</span>
              <span className="new-goal__tracking-option-copy">
                Increment progress yourself when work is finished.
              </span>
            </button>
          </div>
          {trackingMode === "automatic" ? (
            <label className="new-goal__field">
              <span className="new-goal__label">Source</span>
              <select
                value={metric}
                onChange={(event) => setMetric(event.target.value as GoalMetric)}
                className="new-goal__select"
                aria-label="Automatic goal source"
              >
                {automaticMetricOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>

        <section className="new-goal__section">
          <div className="new-goal__sentence" aria-label="Goal builder">
            <span className="new-goal__sentence-text">I want to complete</span>
            <input
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              className="new-goal__sentence-input"
              inputMode="numeric"
              aria-label="Goal target"
              autoFocus
            />
            <span className="new-goal__sentence-text">
              {trackingMode === "manual" ? "units per" : "tasks per"}
            </span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as GoalPeriod)}
              className="new-goal__sentence-select"
              aria-label="Goal period"
            >
              {periodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="new-goal__section">
          <div className="new-goal__section-header">
            <p className="new-goal__section-title">Scope</p>
            <span className="new-goal__section-hint">(optional)</span>
          </div>
          <label className="new-goal__field">
            <span className="new-goal__label">Project</span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="new-goal__select"
              aria-label="Goal project"
            >
              <option value="">Select project</option>
              {projects.map((availableProject) => (
                <option key={availableProject.id} value={availableProject.id}>
                  {availableProject.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="new-goal__section">
          <div className="new-goal__section-header">
            <p className="new-goal__section-title">Details</p>
          </div>
          <label className="new-goal__field">
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleTouched(true);
              }}
              className="new-goal__input"
              placeholder={generatedTitle}
              aria-label="Goal title"
            />
          </label>
          <label className="new-goal__field">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="new-goal__textarea"
              placeholder="Optional description..."
              aria-label="Goal description"
            />
          </label>
        </section>

        <section className="new-goal__section">
          <div className="new-goal__section-header">
            <p className="new-goal__section-title">Preview</p>
          </div>
          <div className="new-goal__preview">
            {previewTitle}
            {selectedProject ? ` - ${selectedProject.name}` : ""}
          </div>
        </section>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </FloatingPanel>
  );
}

function buildGoalSummary(targetValue: number, period: GoalPeriod, projectName: string) {
  const normalizedProject = projectName.trim();
  const periodLabel = period.slice(0, 1).toUpperCase() + period.slice(1);

  if (normalizedProject) {
    return `Complete ${targetValue} tasks per ${periodLabel} for ${normalizedProject}`;
  }

  return `Complete ${targetValue} tasks per ${periodLabel}`;
}
