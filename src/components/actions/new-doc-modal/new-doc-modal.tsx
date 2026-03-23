import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";

export function NewDocModal({
  isOpen,
  onClose,
  projects,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; name: string }>;
  onSubmit: (doc: {
    title: string;
    body: string;
    projectId: string;
    openDetailOnSuccess?: boolean;
  }) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setProjectId("");
    }
  }, [isOpen]);

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
      body: "",
      projectId,
      openDetailOnSuccess: true,
    });
  }

  return (
    <Modal ariaLabelledBy="new-doc-title" className="new-task" onClose={onClose}>
      <form
        ref={formRef}
        className="new-task__form"
        onSubmit={handleSubmit}
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          formRef.current?.requestSubmit();
        }}
      >
        <p id="new-doc-title" className="new-task__title">
          New doc
        </p>
        <FormField>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="modal-form__input ui-input"
            placeholder="Title"
            aria-label="Doc title"
            autoFocus
          />
        </FormField>
        <div className="ui-form-field">
          <span className="ui-form-field__header">
            <span className="ui-form-field__hint">optional</span>
          </span>
          <div className="new-task__project-row" role="group" aria-label="Doc project options">
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
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
