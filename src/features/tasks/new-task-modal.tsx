import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "../../components/ui/form-field";
import { Modal } from "../../components/ui/modal";

export function NewTaskModal({
  isOpen,
  onClose,
  goals,
  initialGoalId,
  projects,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  goals: Array<{
    id: string;
    title: string;
    remainingSlots: number;
    projectId?: string;
  }>;
  initialGoalId?: string;
  projects: Array<{ id: string; name: string }>;
  onSubmit: (task: {
    title: string;
    description: string;
    projectId: string;
    goalId: string;
    openDetailOnSuccess?: boolean;
  }) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [goalId, setGoalId] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setProjectId("");
      setGoalId("");
      return;
    }

    const initialGoal = goals.find((goal) => goal.id === initialGoalId);
    setGoalId(initialGoal?.id ?? "");
    setProjectId(initialGoal?.projectId ?? "");
  }, [goals, initialGoalId, isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      goalId,
      projectId,
      openDetailOnSuccess: true,
    });
  }

  const visibleGoals = goals.filter((goal) => {
    if (projectId === "") {
      return true;
    }

    return goal.projectId === projectId;
  });
  return (
    <Modal ariaLabelledBy="new-task-title" className="new-task" onClose={onClose}>
      <form
        ref={formRef}
        className="new-task__form"
        onSubmit={handleSubmit}
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          if (event.target instanceof HTMLTextAreaElement) {
            if (event.shiftKey) {
              return;
            }

            if (event.metaKey || event.ctrlKey || !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }

            return;
          }

          event.preventDefault();
          formRef.current?.requestSubmit();
        }}
      >
        <p id="new-task-title" className="new-task__title">
          New task
        </p>
        <FormField>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="modal-form__input ui-input"
            placeholder="Title"
            aria-label="Task title"
            autoFocus
          />
        </FormField>
        <FormField>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="modal-form__textarea ui-input"
            placeholder="Description"
            aria-label="Task description"
          />
        </FormField>
        <div className="ui-form-field">
          <span className="ui-form-field__header">
            <span className="ui-form-field__hint">optional</span>
          </span>
          <div className="new-task__project-row" role="group" aria-label="Task project options">
            <button
              type="button"
              className={`new-task__project-choice ${projectId === "" ? "is-active" : ""}`}
              onClick={() => setProjectId("")}
              aria-pressed={projectId === ""}
            >
              No project
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`new-task__project-choice ${
                  projectId === project.id ? "is-active" : ""
                }`}
                onClick={() => setProjectId(project.id)}
                aria-pressed={projectId === project.id}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>
        <div className="ui-form-field">
          <span className="ui-form-field__header">
            <span className="ui-form-field__hint">optional</span>
          </span>
          <div className="new-task__project-row" role="group" aria-label="Task goal options">
            <button
              type="button"
              className={`new-task__project-choice ${goalId === "" ? "is-active" : ""}`}
              onClick={() => setGoalId("")}
              aria-pressed={goalId === ""}
            >
              No goal
            </button>
            {visibleGoals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                className={`new-task__project-choice ${goalId === goal.id ? "is-active" : ""}`}
                onClick={() => {
                  setGoalId(goal.id);
                  if (goal.projectId) {
                    setProjectId(goal.projectId);
                  }
                }}
                aria-pressed={goalId === goal.id}
                disabled={goal.remainingSlots <= 0}
              >
                {goal.title}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
