import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";

export function NewProjectModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: { name: string; description: string; hasKanbanBoard: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasKanbanBoard, setHasKanbanBoard] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setHasKanbanBoard(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    submitProject();
  }

  function submitProject() {
    if (!name.trim()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      hasKanbanBoard,
    });
  }

  return (
    <Modal ariaLabelledBy="new-project-title" className="new-task" onClose={onClose}>
      <form className="new-task__form" onSubmit={handleSubmit}>
        <p id="new-project-title" className="new-task__title">
          New project
        </p>
        <FormField label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitProject();
              }
            }}
            className="modal-form__input ui-input"
            placeholder="Name"
            aria-label="Project name"
            autoFocus
          />
        </FormField>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitProject();
              }
            }}
            className="modal-form__textarea ui-input"
            placeholder="Description"
            aria-label="Project description"
          />
        </FormField>
        <label
          className={`project-mode-toggle ${hasKanbanBoard ? "is-checked" : ""}`.trim()}
        >
          <input
            type="checkbox"
            className="project-mode-toggle__checkbox"
            checked={hasKanbanBoard}
            onChange={(event) => setHasKanbanBoard(event.target.checked)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitProject();
              }
            }}
            aria-label="Enable kanban board"
          />
          <span
            className={`project-mode-toggle__switch ${hasKanbanBoard ? "is-checked" : ""}`.trim()}
            aria-hidden="true"
          />
          <span className="project-mode-toggle__label">Enable kanban board</span>
        </label>
      </form>
    </Modal>
  );
}
