import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { ActionBar } from "@/components/actions/action-bar";
import { Modal } from "@/components/actions/modal";
import { PageShell } from "@/components/layout/page-shell";
import { useDebouncedTaskDraft } from "@/lib/hooks/use-debounced-task-draft";
import { useTaskDescriptionEditor } from "@/lib/hooks/use-task-description-editor";
import { getProjectName } from "@/lib/domain/project-relations";
import type { Project } from "@/models/project";
import type { Item } from "@/models/workspace-item";

type TaskDetailPageProps = {
  task: Item;
  projects: Project[];
  onBack: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
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
  eyebrow = "Tasks",
  backLabel = "Back to tasks",
}: TaskDetailPageProps) {
  const [pendingDeleteTask, setPendingDeleteTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const projectName = getProjectName(projects, task.projectId, task.project) || "None";
  const { commitDraft, draftContent, setDraftContent } = useDebouncedTaskDraft({
    taskId: task.id,
    initialContent: task.content,
    onCommit: (content) => onUpdateTask(task.id, { content }),
  });

  return (
    <PageShell
      ariaLabel="Task detail"
      eyebrow={eyebrow}
      className="page--task-detail"
      headerActions={
        <ActionBar className="task-detail-page__header-actions">
          <button
            type="button"
            className="task-detail-page__button"
            onClick={() => {
              commitDraft();
              onBack();
            }}
          >
            {backLabel}
          </button>
          <button
            type="button"
            className="task-detail-page__button task-detail-page__button--danger"
            onClick={() => setPendingDeleteTask({ id: task.id, title: task.title })}
          >
            Delete task
          </button>
        </ActionBar>
      }
    >
      <div className="task-detail-page__content">
        <header className="task-detail-page__header">
          <p className="task-detail-page__meta">
            {labelForCompletion(task.isCompleted)} • {projectName}
          </p>
          <h1 className="task-detail-page__title">{task.title}</h1>
        </header>

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
      <p className="task-description-editor__label">Description</p>
      <CodeMirror
        value={value}
        aria-label="Task description"
        className="task-description-editor__surface"
        placeholder="Write in markdown"
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
