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
import {
  taskDescriptionCodeLanguages,
  taskDescriptionHighlightExtensions,
} from "@/lib/codemirror/task-description-markdown";
import { useDebouncedTaskDraft } from "@/lib/hooks/use-debounced-task-draft";
import { useTaskDescriptionEditor } from "@/lib/hooks/use-task-description-editor";
import { useTaskDetailNavigation } from "@/lib/hooks/use-task-detail-navigation";
import { getProjectName } from "@/lib/domain/project-relations";
import { markdownConceal } from "@/lib/codemirror/markdown-conceal";
import type { Project } from "@/models/project";
import type { Item } from "@/models/workspace-item";

type TaskDetailPageProps = {
  task: Item;
  projects: Project[];
  onBack: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onNotify: (message: string, type?: "inform" | "success" | "warning") => void;
  eyebrow?: string;
  backLabel?: string;
  draftResetKey?: number;
};

const taskDescriptionExtensions = [
  vim(),
  markdown({
    codeLanguages: taskDescriptionCodeLanguages,
  }),
  ...taskDescriptionHighlightExtensions,
  markdownConceal,
  EditorView.lineWrapping,
  EditorView.theme({
    "&": {
      backgroundColor: "transparent",
      color: "var(--color-text-primary)",
      fontFamily: '"Recursive Variable", "IBM Plex Sans", "Segoe UI", sans-serif',
      fontSize: "1rem",
      fontWeight: "360",
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
    ".cm-line--code-block": {
      padding: "0.15rem 0.9rem",
      margin: "0",
      background: "color-mix(in srgb, var(--color-surface-elevated) 88%, black 12%)",
      color: "var(--color-text-primary)",
      fontFamily: '"Recursive Variable", "JetBrains Mono", monospace',
      fontVariationSettings: '"MONO" 1, "CASL" 0.25',
      fontSize: "0.92rem",
      lineHeight: "1.65",
    },
    ".cm-line--code-block-info": {
      paddingTop: "0.75rem",
      paddingBottom: "0.35rem",
      color: "var(--color-text-secondary)",
      fontSize: "0.72rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
    ".cm-line--code-block-body": {
      color: "var(--color-text-primary)",
    },
    ".cm-line--code-block-end": {
      paddingTop: "0.15rem",
      paddingBottom: "0.75rem",
      color: "var(--color-text-primary)",
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
    ".cm-header": {
      color: "var(--color-text-secondary)",
      letterSpacing: "0.01em",
    },
    ".cm-header-1": {
      color: "var(--color-accent)",
      fontWeight: 600,
    },
    ".cm-header-2": {
      color: "var(--color-accent-hover)",
      fontWeight: 600,
    },
    ".cm-header-3": {
      color: "var(--color-text-primary)",
      opacity: 0.8,
    },
    ".cm-link": {
      color: "var(--color-accent)",
      textDecoration: "underline",
      textDecorationColor: "color-mix(in srgb, var(--color-accent) 40%, transparent 60%)",
    },
    ".cm-link:hover": {
      color: "var(--color-accent-hover)",
    },
    ".cm-strong": {
      color: "var(--color-text-primary)",
      fontWeight: 600,
    },
    ".cm-emphasis": {
      color: "var(--color-text-muted)",
      fontStyle: "italic",
    },
    ".cm-formatting": {
      color: "var(--color-text-secondary)",
    },
    ".cm-formatting-link": {
      color: "var(--color-accent-hover)",
      fontWeight: 500,
    },
    ".cm-formatting-list": {
      color: "var(--color-accent-hover)",
      fontWeight: 600,
    },
    ".cm-list": {
      color: "var(--color-text-primary)",
    },
    ".cm-conceal-widget": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    ".cm-conceal-widget--list": {
      minWidth: "1.15rem",
      color: "var(--color-accent-hover)",
      marginRight: "0.35rem",
      fontSize: "0.9rem",
      fontWeight: 600,
      letterSpacing: "0.05em",
    },
    ".cm-conceal-widget--heading": {
      minWidth: "1.15rem",
      height: "1rem",
      padding: "0 0.32rem",
      marginRight: "0.45rem",
      borderRadius: "999px",
      background: "color-mix(in srgb, var(--color-accent) 16%, transparent 84%)",
      color: "var(--color-accent)",
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.03em",
      lineHeight: 1,
      verticalAlign: "baseline",
      transform: "translateY(-0.06em)",
    },
    ".cm-line--list": {
      paddingLeft: "0.35rem",
      marginLeft: "-0.35rem",
      borderRadius: "0.5rem",
      background: "color-mix(in srgb, var(--color-surface-elevated) 55%, transparent 45%)",
      border: "1px solid color-mix(in srgb, var(--color-panel-muted) 40%, transparent 60%)",
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
  draftResetKey = 0,
}: TaskDetailPageProps) {
  const [pendingDeleteTask, setPendingDeleteTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const projectName = getProjectName(projects, task.projectId, task.project) || "None";
  const projectTemplateFields =
    projects.find((project) => project.id === task.projectId)?.taskTemplate?.fields ?? [];
  const { draftContent, setDraftContent } = useDebouncedTaskDraft({
    taskId: task.id,
    initialContent: task.content,
    syncKey: `${task.updatedAt}:${draftResetKey}`,
    onCommit: (content) => onUpdateTask(task.id, { content }),
  });
  const exitShortcutArmedRef = useRef(false);
  const exitShortcutTimeoutRef = useRef<number | null>(null);
  const containerRef = useTaskDetailNavigation();

  useEffect(() => {
    function clearExitShortcut() {
      exitShortcutArmedRef.current = false;

      if (exitShortcutTimeoutRef.current !== null) {
        window.clearTimeout(exitShortcutTimeoutRef.current);
        exitShortcutTimeoutRef.current = null;
      }
    }

    function armExitShortcut() {
      clearExitShortcut();
      exitShortcutArmedRef.current = true;
      exitShortcutTimeoutRef.current = window.setTimeout(() => {
        clearExitShortcut();
      }, 1200);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (pendingDeleteTask) {
        clearExitShortcut();
        return;
      }

      const loweredKey = event.key.toLowerCase();

      if (!exitShortcutArmedRef.current) {
        if (event.ctrlKey && !event.metaKey && !event.altKey && loweredKey === "z") {
          event.preventDefault();
          event.stopPropagation();
          armExitShortcut();
        }

        return;
      }

      if (!event.metaKey && !event.altKey && loweredKey === "z") {
        event.preventDefault();
        event.stopPropagation();
        clearExitShortcut();
        onBack();
        return;
      }

      if (!["Control", "Shift", "Alt", "Meta"].includes(event.key)) {
        clearExitShortcut();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearExitShortcut();
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onBack, pendingDeleteTask]);

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
            {labelForCompletion(task.isCompleted)} • {projectName}
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
  const { handleEditorCreate, handleEditorUpdate, vimMode } = useTaskDescriptionEditor(focusKey);
  const wordCount = countWords(value);
  const characterCount = value.length;

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
          closeBrackets: false,
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
      <div className="task-description-editor__status" aria-label="Editor status">
        <span className="task-description-editor__status-mode" data-mode={vimMode}>
          {formatEditorModeLabel(vimMode)}
        </span>
        <span className="task-description-editor__status-counts">
          {wordCount}W {characterCount}C
        </span>
      </div>
    </div>
  );
}

function countWords(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  return trimmedValue.split(/\s+/).length;
}

function formatEditorModeLabel(mode: "insert" | "normal" | "visual") {
  return mode.toUpperCase();
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
