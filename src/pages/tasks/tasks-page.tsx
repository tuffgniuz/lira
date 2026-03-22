import { useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "@/components/actions/action-bar";
import { EmptyState } from "@/components/feedback/empty-state";
import { Modal } from "@/components/actions/modal";
import { PageShell } from "@/components/layout/page-shell";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";
import { getProjectName } from "@/lib/domain/project-relations";

type TasksPageProps = {
  items: Item[];
  projects: Project[];
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onNotify: (message: string) => void;
};

const filterItems: Array<{ id: "open" | "completed" | "all"; label: string }> = [
  { id: "open", label: "Open" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

const taskListMotionOffsets = {
  j: 1,
  k: -1,
  ArrowDown: 1,
  ArrowUp: -1,
} as const satisfies Record<string, 1 | -1>;

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable ||
      target.getAttribute("contenteditable") === "true" ||
      target.closest("[contenteditable]") !== null)
  );
}

export function TasksPage({
  items,
  projects,
  onSelectTask,
  onDeleteTask,
  onNotify,
}: TasksPageProps) {
  const [activeFilter, setActiveFilter] = useState<"open" | "completed" | "all">("all");
  const [activeTaskId, setActiveTaskId] = useState("");
  const [deleteChordArmed, setDeleteChordArmed] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const filterCounts = useMemo(
    () => ({
      open: items.filter(
        (item) => item.kind === "task" && item.state !== "deleted" && !item.isCompleted,
      ).length,
      completed: items.filter(
        (item) => item.kind === "task" && item.state !== "deleted" && item.isCompleted,
      ).length,
      all: items.filter((item) => item.kind === "task" && item.state !== "deleted").length,
    }),
    [items],
  );

  const rows = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.kind === "task" &&
          item.state !== "deleted" &&
          (activeFilter === "all" ||
            (activeFilter === "completed" ? item.isCompleted : !item.isCompleted)),
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        isCompleted: item.isCompleted,
        priority: item.priority || "None",
        due: item.dueDate || "None",
        project: getProjectName(projects, item.projectId, item.project) || "None",
        onSelect: () => onSelectTask(item.id),
      }));
  }, [activeFilter, items, onSelectTask, projects]);

  useEffect(() => {
    if (!rows.length) {
      setActiveTaskId("");
      return;
    }

    if (!rows.some((row) => row.id === activeTaskId)) {
      setActiveTaskId(rows[0].id);
    }
  }, [activeTaskId, rows]);

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }

    const row = rowRefs.current.get(activeTaskId);

    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeTaskId]);

  useEffect(() => {
    if (!deleteChordArmed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDeleteChordArmed(false);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [deleteChordArmed]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (pendingDeleteTask) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        setDeleteChordArmed(false);
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === "1") {
          event.preventDefault();
          setActiveFilter("open");
          setDeleteChordArmed(false);
          return;
        }

        if (event.key === "2") {
          event.preventDefault();
          setActiveFilter("completed");
          setDeleteChordArmed(false);
          return;
        }

        if (event.key === "3") {
          event.preventDefault();
          setActiveFilter("all");
          setDeleteChordArmed(false);
          return;
        }
      }

      if (
        deleteChordArmed &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() !== "d"
      ) {
        setDeleteChordArmed(false);
      }

      if (event.key.toLowerCase() === "d") {
        if (!activeTaskId) {
          return;
        }

        event.preventDefault();

        if (!deleteChordArmed) {
          setDeleteChordArmed(true);
          return;
        }

        const activeRow = rows.find((row) => row.id === activeTaskId);

        if (!activeRow) {
          setDeleteChordArmed(false);
          return;
        }

        setPendingDeleteTask({ id: activeRow.id, title: activeRow.title });
        setDeleteChordArmed(false);
        return;
      }

      if (event.key === "Enter") {
        if (!activeTaskId) {
          return;
        }

        event.preventDefault();
        const activeRow = rows.find((row) => row.id === activeTaskId);
        activeRow?.onSelect();
        return;
      }

      const offset = taskListMotionOffsets[event.key as keyof typeof taskListMotionOffsets];

      if (!offset || !rows.length) {
        return;
      }

      event.preventDefault();

      const currentIndex = rows.findIndex((row) => row.id === activeTaskId);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.max(0, Math.min(rows.length - 1, startIndex + offset));
      setActiveTaskId(rows[nextIndex].id);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTaskId, deleteChordArmed, pendingDeleteTask, rows]);

  return (
    <PageShell ariaLabel="Tasks" eyebrow="Tasks" className="page--tasks">
      <div className="tasks-toolbar inbox-filters" aria-label="Task filters">
        {filterItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tasks-filter inbox-filter ${
              activeFilter === item.id ? "is-active inbox-filter--active" : ""
            }`}
            onClick={() => setActiveFilter(item.id)}
          >
            <span>{item.label}</span>
            <span className="inbox-filter__count" aria-hidden="true">
              {filterCounts[item.id]}
            </span>
          </button>
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="tasks-table-wrap">
          <table className="tasks-table">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Completed</th>
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
                  ref={(element) => {
                    if (element) {
                      rowRefs.current.set(row.id, element);
                    } else {
                      rowRefs.current.delete(row.id);
                    }
                  }}
                  className={activeTaskId === row.id ? "is-active" : ""}
                  aria-selected={activeTaskId === row.id}
                >
                  <td className="tasks-table__title-cell">
                    <button
                      type="button"
                      className="tasks-table__row-button"
                      onClick={() => {
                        setActiveTaskId(row.id);
                        row.onSelect();
                      }}
                    >
                      <span
                        className={`tasks-table__marker tasks-table__marker--${
                          row.isCompleted ? "done" : "inbox"
                        }`}
                      />
                      <span>{row.title}</span>
                    </button>
                  </td>
                  <td>{labelForCompletion(row.isCompleted)}</td>
                  <td>{row.priority}</td>
                  <td>{row.due}</td>
                  <td>{row.project}</td>
                  <td className="tasks-table__actions-cell">
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
      ) : (
        <EmptyState
          className="tasks-empty"
          badge="Tasks"
          title="No tasks match this view"
          copy="Change the filter to bring tasks back into focus."
        />
      )}

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
