import { useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { Vim, vim } from "@replit/codemirror-vim";
import { FloatingPanel } from "../../components/floating-panel";
import type { Item, TaskStatus } from "../../models/item";
import type { Project } from "../../models/project";
import { getProjectName } from "../../lib/domain/project-relations";

type TasksPageProps = {
  items: Item[];
  projects: Project[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
};

const filterItems: Array<{ id: TaskStatus | "all"; label: string }> = [
  { id: "inbox", label: "Inbox" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All" },
  { id: "done", label: "Done" },
];

let taskPanelVimBindingsRegistered = false;

function ensureTaskPanelVimBindings() {
  if (taskPanelVimBindingsRegistered) {
    return;
  }

  Vim.defineEx("closepanel", "closepanel", () => {
    window.dispatchEvent(new CustomEvent("kenchi:close-task-panel"));
  });
  Vim.map(":", "<Nop>", "normal");
  Vim.map("<C-z>z", ":closepanel<CR>", "normal");
  taskPanelVimBindingsRegistered = true;
}

export function TasksPage({
  items,
  projects,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
  onDeleteTask,
}: TasksPageProps) {
  const [activeFilter, setActiveFilter] = useState<TaskStatus | "all">("all");
  const [pendingDeleteTask, setPendingDeleteTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const selectedTask =
    items.find((item) => item.id === selectedTaskId && item.kind === "task") ?? null;

  const rows = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.kind === "task" &&
          item.state !== "deleted" &&
          (activeFilter === "all" || item.taskStatus === activeFilter),
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        status: item.taskStatus,
        priority: item.priority || "None",
        due: item.dueDate || "None",
        project: getProjectName(projects, item.projectId, item.project) || "None",
        isSelected: selectedTaskId === item.id,
        onSelect: () => onSelectTask(item.id),
      }));
  }, [activeFilter, items, onSelectTask, projects, selectedTaskId]);

  const selectedRow = rows.find((row) => row.id === selectedTaskId) ?? null;

  return (
    <section className="page page--tasks" aria-label="Tasks">
      <div className="page__header page__header--tasks">
        <div>
          <p className="page__eyebrow">Tasks</p>
        </div>
      </div>

      <div className="tasks-toolbar" aria-label="Task filters">
        {filterItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tasks-filter ${activeFilter === item.id ? "is-active" : ""}`}
            onClick={() => setActiveFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="tasks-stage">
          <div className="tasks-table-wrap">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Status</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Due</th>
                  <th scope="col">Project</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.isSelected ? "is-active" : ""}
                    onClick={row.onSelect}
                  >
                    <td className="tasks-table__title-cell">
                      <button type="button" className="tasks-table__row-button">
                        <span className={`tasks-table__marker tasks-table__marker--${row.status}`} />
                        <span>{row.title}</span>
                      </button>
                    </td>
                    <td>{labelForStatus(row.status)}</td>
                    <td>{row.priority}</td>
                    <td>{row.due}</td>
                    <td>{row.project}</td>
                    <td
                      className="tasks-table__actions-cell"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="tasks-item__actions" aria-label="Task actions">
                        <button
                          type="button"
                          className="inbox-action"
                          onClick={() => setPendingDeleteTask({ id: row.id, title: row.title })}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside
            className={`task-detail-panel ${selectedRow ? "is-open" : ""}`}
            aria-label="Task detail"
            aria-hidden={selectedRow ? undefined : true}
          >
            {selectedRow ? (
              <div className="task-detail-pane__content">
                <h2 className="task-detail-pane__title">{selectedRow.title}</h2>
                <p className="task-detail-pane__meta">
                  {labelForStatus(selectedRow.status)} • {selectedRow.project}
                </p>
                {selectedTask ? (
                  <TaskDescriptionEditor
                    value={selectedTask.content}
                    onChange={(content) => onUpdateTask(selectedTask.id, { content })}
                  />
                ) : (
                  <p className="task-detail-pane__meta">
                    Markdown editing is available for saved tasks.
                  </p>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      ) : (
        <div className="tasks-empty">
          <div className="tasks-empty__art" aria-hidden="true">
            <svg viewBox="0 0 180 180" className="tasks-empty__svg">
              <defs>
                <linearGradient id="tasks-empty-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--color-focus-ring)" stopOpacity="0.75" />
                </linearGradient>
              </defs>
              <circle
                cx="90"
                cy="90"
                r="68"
                fill="url(#tasks-empty-gradient)"
                opacity="0.12"
              />
              <rect
                x="48"
                y="54"
                width="84"
                height="72"
                rx="14"
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth="4"
              />
              <path
                d="M66 76h48M66 92h36M66 108h24"
                fill="none"
                stroke="var(--color-text-secondary)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="132" cy="56" r="12" fill="var(--color-panel-bg)" />
              <path
                d="M132 50v12M126 56h12"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="tasks-empty__title">No tasks match this view</p>
          <p className="tasks-empty__copy">Change the filter to bring tasks back into focus.</p>
        </div>
      )}

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
    </section>
  );
}

function labelForStatus(status: TaskStatus) {
  switch (status) {
    case "today":
      return "Today";
    case "upcoming":
      return "Upcoming";
    case "done":
      return "Done";
    default:
      return "Inbox";
  }
}

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
      lineHeight: "1.6",
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
      borderLeftColor: "var(--color-text-primary)",
      borderLeftWidth: "2px",
    },
    ".cm-fat-cursor, .cm-fat-cursor-mark": {
      backgroundColor: "var(--color-text-primary)",
      color: "var(--color-main-bg)",
    },
  }),
];

ensureTaskPanelVimBindings();

function TaskDescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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
    <FloatingPanel
      ariaLabelledBy="task-delete-confirm-title"
      className="inbox-confirm"
      onClose={onClose}
    >
      <div className="inbox-confirm__content">
        <p id="task-delete-confirm-title" className="new-task__title">
          Delete task
        </p>
        <p className="inbox-confirm__item">{taskTitle}</p>
        <p className="inbox-confirm__copy">This will permanently remove the task.</p>
        <div className="inbox-confirm__actions">
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
        </div>
      </div>
    </FloatingPanel>
  );
}
