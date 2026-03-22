import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { ActionBar } from "@/components/actions/action-bar";
import { Modal } from "@/components/actions/modal";
import { FormField } from "@/components/data-input/form-field";
import { PageShell } from "@/components/layout/page-shell";
import { TrashIcon } from "@/components/icons";
import { useDebouncedTaskDraft } from "@/lib/hooks/use-debounced-task-draft";
import { useTaskDescriptionEditor } from "@/lib/hooks/use-task-description-editor";
import { useTaskDetailNavigation } from "@/lib/hooks/use-task-detail-navigation";
import { getProjectName } from "@/lib/domain/project-relations";
import { formatRelativeTimestamp } from "@/lib/utils/format-relative-timestamp";
import type { Project } from "@/models/project";
import type { Item } from "@/models/workspace-item";

type TaskDetailPageProps = {
  task: Item;
  projects: Project[];
  onBack: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onNotify: (message: string) => void;
  eyebrow?: string;
  backLabel?: string;
};

const taskDescriptionExtensions = [
  vim(),
  markdown(),
  EditorView.lineWrapping,
  EditorView.theme({
    "&": {
      backgroundColor: "transparent",
      color: "var(--color-text-primary)",
      fontFamily: "inherit",
      fontSize: "0.95rem",
      lineHeight: "1.7",
    },
    ".cm-editor": {
      backgroundColor: "transparent",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
    },
    ".cm-content": {
      minHeight: "18rem",
      padding: "0",
      caretColor: "var(--color-text-primary)",
    },
    ".cm-line": {
      padding: "0",
    },
    ".cm-gutters": {
      display: "none",
    },
    ".cm-focused": {
      outline: "none",
    },
    ".cm-cursor, .cm-dropCursor": {
      backgroundColor: "var(--color-text-primary)",
      width: "2px",
    },
    ".cm-fat-cursor, .cm-fat-cursor-mark": {
      backgroundColor: "var(--color-text-primary)",
      color: "var(--color-main-bg)",
    },
  }),
];

export function TaskDetailPage({
  task,
  projects,
  onBack,
  onUpdateTask,
  onDeleteTask,
  onNotify,
  eyebrow = "Tasks",
  backLabel = "Back to tasks",
}: TaskDetailPageProps) {
  const [pendingDeleteTask, setPendingDeleteTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const projectName = getProjectName(projects, task.projectId, task.project) || "None";
  const projectTemplateFields =
    projects.find((project) => project.id === task.projectId)?.taskTemplate?.fields ?? [];
  const { commitDraft, draftContent, setDraftContent } = useDebouncedTaskDraft({
    taskId: task.id,
    initialContent: task.content,
    onCommit: (content) => onUpdateTask(task.id, { content }),
  });

  const containerRef = useTaskDetailNavigation();

  return (
    <PageShell
      ariaLabel="Task detail"
      className="page--task-detail"
      headerActions={
        <ActionBar className="task-detail-page__header-actions">
          <button
            type="button"
            className="task-detail-page__button task-detail-page__button--danger"
            aria-label="Delete task"
            onClick={() => setPendingDeleteTask({ id: task.id, title: task.title })}
          >
            <TrashIcon className="task-detail-page__icon" />
          </button>
        </ActionBar>
      }
    >
      <div ref={containerRef} className="task-detail-page__content">
        <header className="task-detail-page__header">
          <p className="task-detail-page__meta">
            {labelForCompletion(task.isCompleted)} • {projectName} • {formatTaskTimestampLabel(task)}
          </p>
          <h1 className="task-detail-page__title">
            <TaskTitleEditor
              taskId={task.id}
              initialTitle={task.title}
              onUpdateTitle={(title) => onUpdateTask(task.id, { title })}
            />
          </h1>
        </header>

        {projectTemplateFields.length ? (
          <section className="task-detail-page__project-fields" aria-label="Project fields">
            <div className="task-detail-page__project-field-stack">
              {projectTemplateFields.map((field) => (
                field.type === "boolean" ? (
                  <FormField key={field.id} label={field.label} className="task-detail-page__project-form-field">
                    <label className="task-detail-page__checkbox-field">
                      <input
                        type="checkbox"
                        className="task-detail-page__checkbox-input"
                        aria-label={field.label}
                        checked={(task.customFieldValues?.[field.key] ?? "") === "true"}
                        onChange={(event) =>
                          onUpdateTask(task.id, {
                            customFieldValues: {
                              ...(task.customFieldValues ?? {}),
                              [field.key]: event.target.checked ? "true" : "false",
                            },
                          })
                        }
                      />
                      <span className="task-detail-page__checkbox-ui" aria-hidden="true" />
                    </label>
                  </FormField>
                ) : (
                  <FormField key={field.id} label={field.label} className="task-detail-page__project-form-field">
                    <input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      className="ui-input"
                      aria-label={field.label}
                      placeholder={`Add ${field.label}`}
                      value={task.customFieldValues?.[field.key] ?? ""}
                      onChange={(event) =>
                        onUpdateTask(task.id, {
                          customFieldValues: {
                            ...(task.customFieldValues ?? {}),
                            [field.key]: event.target.value,
                          },
                        })
                      }
                    />
                  </FormField>
                )
              ))}
            </div>
          </section>
        ) : null}

        <TaskDescriptionEditor
          focusKey={task.id}
          value={draftContent}
          onChange={setDraftContent}
        />
      </div>

      {pendingDeleteTask ? (
        <TaskDeleteConfirmModal
          taskTitle={pendingDeleteTask.title}
          onClose={() => setPendingDeleteTask(null)}
          onConfirm={() => {
            onDeleteTask(pendingDeleteTask.id);
            setPendingDeleteTask(null);
            onNotify(`Task "${pendingDeleteTask.title}" deleted`);
          }}
        />
      ) : null}
    </PageShell>
  );
}

function labelForCompletion(isCompleted: boolean) {
  return isCompleted ? "Completed" : "Open";
}

function TaskDescriptionEditor({
  focusKey,
  value,
  onChange,
}: {
  focusKey: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { handleEditorCreate, handleEditorUpdate } = useTaskDescriptionEditor(focusKey);

  return (
    <div className="task-description-editor">
      <CodeMirror
        value={value}
        aria-label="Task description"
        className="task-description-editor__surface"
        placeholder="Add task description"
        extensions={taskDescriptionExtensions}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
        onCreateEditor={handleEditorCreate}
        onUpdate={(update) => {
          handleEditorUpdate(update.view);
        }}
        onChange={onChange}
      />
    </div>
  );
}

function TaskDeleteConfirmModal({
  taskTitle,
  onClose,
  onConfirm,
}: {
  taskTitle: string;
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
    <Modal ariaLabelledBy="task-delete-confirm-title" className="inbox-confirm" onClose={onClose}>
      <div className="inbox-confirm__content">
        <p id="task-delete-confirm-title" className="new-task__title">
          Delete task
        </p>
        <p className="inbox-confirm__item">{taskTitle}</p>
        <p className="inbox-confirm__copy">This will permanently remove the task.</p>
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

function formatTaskTimestampLabel(task: Item) {
  const timestampPrefix = task.updatedAt !== task.createdAt ? "UPDATED" : "CREATED";
  const timestampValue = formatRelativeTimestamp(
    task.updatedAt !== task.createdAt ? task.updatedAt : task.createdAt,
  );

  return `${timestampPrefix} ${timestampValue.toUpperCase()}`;
}

function TaskTitleEditor({
  taskId,
  initialTitle,
  onUpdateTitle,
}: {
  taskId: string;
  initialTitle: string;
  onUpdateTitle: (title: string) => void;
}) {
  const { commitDraft, draftContent, setDraftContent } = useDebouncedTaskDraft({
    taskId,
    initialContent: initialTitle,
    onCommit: onUpdateTitle,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [draftContent]);

  return (
    <textarea
      ref={textareaRef}
      className="task-detail-page__title-input"
      aria-label="Task title"
      rows={1}
      value={draftContent}
      onChange={(event) => setDraftContent(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
