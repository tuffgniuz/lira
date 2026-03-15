import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FloatingPanel } from "../../components/floating-panel";
import type { GoalMetricType, GoalPeriod } from "../../models/item";

const metricOptions: Array<{ id: GoalMetricType; label: string }> = [
  { id: "tasks_completed", label: "Tasks completed" },
  { id: "inbox_items_processed", label: "Inbox items processed" },
  { id: "journal_entries_written", label: "Journal entries written" },
  { id: "notes_created", label: "Notes created" },
];

const periodOptions: Array<{ id: GoalPeriod; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export function NewGoalModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: {
    title: string;
    description: string;
    targetValue: number;
    period: GoalPeriod;
    metricType: GoalMetricType;
    project: string;
    tagFilter: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("1");
  const [period, setPeriod] = useState<GoalPeriod>("daily");
  const [metricType, setMetricType] = useState<GoalMetricType>("tasks_completed");
  const [project, setProject] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setTargetValue("1");
      setPeriod("daily");
      setMetricType("tasks_completed");
      setProject("");
      setTagFilter("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedTarget = Number.parseInt(targetValue, 10);

    if (!title.trim() || Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      targetValue: parsedTarget,
      period,
      metricType,
      project: project.trim(),
      tagFilter: tagFilter.trim(),
    });
  }

  return (
    <FloatingPanel ariaLabelledBy="new-goal-title" className="new-goal" onClose={onClose}>
      <form className="new-goal__form" onSubmit={handleSubmit}>
        <p id="new-goal-title" className="new-task__title">
          New goal
        </p>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="new-task__input"
          placeholder="Title"
          aria-label="Goal title"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="new-task__textarea"
          placeholder="Description"
          aria-label="Goal description"
        />
        <div className="new-goal__grid">
          <label className="new-goal__field">
            <span className="new-goal__label">Target</span>
            <input
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              className="new-task__input"
              inputMode="numeric"
              aria-label="Goal target"
            />
          </label>
          <label className="new-goal__field">
            <span className="new-goal__label">Period</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as GoalPeriod)}
              className="new-goal__select"
              aria-label="Goal period"
            >
              {periodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="new-goal__field new-goal__field--full">
            <span className="new-goal__label">Metric</span>
            <select
              value={metricType}
              onChange={(event) => setMetricType(event.target.value as GoalMetricType)}
              className="new-goal__select"
              aria-label="Goal metric"
            >
              {metricOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="new-goal__field">
            <span className="new-goal__label">Project</span>
            <input
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className="new-task__input"
              placeholder="Optional"
              aria-label="Goal project"
            />
          </label>
          <label className="new-goal__field">
            <span className="new-goal__label">Tag</span>
            <input
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              className="new-task__input"
              placeholder="Optional"
              aria-label="Goal tag"
            />
          </label>
        </div>
      </form>
    </FloatingPanel>
  );
}
