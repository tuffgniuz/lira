import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { Vim, getCM, vim } from "@replit/codemirror-vim";
import { ActionBar } from "../../components/ui/action-bar";
import { Modal } from "../../components/ui/modal";
import { PageShell } from "../../components/ui/page-shell";
import { getProjectName } from "../../lib/domain/project-relations";
import type { Project } from "../../models/project";
import type { Item } from "../../models/workspace-item";

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
  const [draftContent, setDraftContent] = useState(task.content);
  const latestDraftContentRef = useRef(task.content);
  const lastSubmittedContentRef = useRef(task.content);
  const debounceTimeoutRef = useRef<number | null>(null);
  const projectName = getProjectName(projects, task.projectId, task.project) || "None";

  useEffect(() => {
    setDraftContent(task.content);
    latestDraftContentRef.current = task.content;
    lastSubmittedContentRef.current = task.content;

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, [task.id]);

  function commitDraft() {
    const nextContent = latestDraftContentRef.current;

    if (nextContent === lastSubmittedContentRef.current) {
      return;
    }

    lastSubmittedContentRef.current = nextContent;
    onUpdateTask(task.id, { content: nextContent });
  }

  useEffect(() => {
    if (draftContent === lastSubmittedContentRef.current) {
      return;
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      debounceTimeoutRef.current = null;
      commitDraft();
    }, 350);

    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [draftContent, task.id]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      commitDraft();
    };
  }, [task.id]);

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
          onChange={(content) => {
            latestDraftContentRef.current = content;
            setDraftContent(content);
          }}
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
  const editorViewRef = useRef<EditorView | null>(null);
  const vimModeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      vimModeCleanupRef.current?.();
      vimModeCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorViewRef.current) {
      return;
    }

    focusEditorInInsertMode(editorViewRef.current);
  }, [focusKey]);

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
        onCreateEditor={(view) => {
          editorViewRef.current = view;
          vimModeCleanupRef.current?.();
          vimModeCleanupRef.current = attachVimModeTracking(view);
          focusEditorInInsertMode(view);
        }}
        onUpdate={(update) => {
          syncVimModeAttribute(update.view);
        }}
        onChange={onChange}
      />
    </div>
  );
}

function attachVimModeTracking(view: EditorView) {
  const cm = getVimEditor(view);
  const handleModeChange = (event: { mode?: string }) => {
    view.dom.dataset.vimMode = event.mode === "insert" ? "insert" : "normal";
  };

  syncVimModeAttribute(view);

  if (typeof cm.on === "function") {
    cm.on("vim-mode-change", handleModeChange);
  }

  return () => {
    if (typeof cm.off === "function") {
      cm.off("vim-mode-change", handleModeChange);
    }
  };
}

function syncVimModeAttribute(view: EditorView) {
  const cm = getVimEditor(view);

  view.dom.dataset.vimMode = cm.state?.vim?.insertMode ? "insert" : "normal";
}

function focusEditorInInsertMode(view: EditorView) {
  view.focus();

  const cm = getVimEditor(view);

  if (!cm.state?.vim?.insertMode) {
    Vim.handleKey(cm as never, "i");
    view.dom.dataset.vimMode = "insert";
    return;
  }

  syncVimModeAttribute(view);
}

function getVimEditor(view: EditorView) {
  return getCM(view) as {
    state?: { vim?: { insertMode?: boolean } };
    on?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
    off?: (eventName: string, listener: (event: { mode?: string }) => void) => void;
  };
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
