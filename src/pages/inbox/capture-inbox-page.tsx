import { useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "@/components/actions/action-bar";
import { EmptyState } from "@/components/feedback/empty-state";
import { Modal } from "@/components/actions/modal";
import { PageShell } from "@/components/layout/page-shell";
import { formatRelativeTimestamp } from "@/lib/utils/format-relative-timestamp";
import type { InboxCaptureState, InboxCaptureView } from "./inbox-capture-view";

type PendingInboxAction =
  | { type: "task"; capture: InboxCaptureView }
  | { type: "goal"; capture: InboxCaptureView }
  | { type: "state"; capture: InboxCaptureView; nextState: InboxCaptureState }
  | { type: "delete"; capture: InboxCaptureView };

const captureListMotionOffsets = {
  j: 1,
  k: -1,
  ArrowDown: 1,
  ArrowUp: -1,
} as const satisfies Record<string, 1 | -1>;

const inboxFilterDefinitions = [
  { id: "inbox", label: "Inbox" },
  { id: "someday", label: "Someday" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
] as const;

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

export function CaptureInboxPage({
  captures,
  projects,
  onCreateCapture,
  onConvertCaptureToTask,
  onConvertCaptureToGoal,
  onUpdateCaptureState,
  onDeleteCapture,
  onNotify,
}: {
  captures: InboxCaptureView[];
  projects: Array<{ id: string; name: string }>;
  onCreateCapture: (value: string) => void;
  onConvertCaptureToTask: (captureId: string, projectId?: string) => void;
  onConvertCaptureToGoal: (captureId: string, projectId?: string) => void;
  onUpdateCaptureState: (captureId: string, state: InboxCaptureState) => void;
  onDeleteCapture: (captureId: string) => void;
  onNotify: (message: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<"all" | InboxCaptureState>("inbox");
  const [activeCaptureId, setActiveCaptureId] = useState("");
  const [deleteChordArmed, setDeleteChordArmed] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingInboxAction | null>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const tableRef = useRef<HTMLTableElement | null>(null);
  const filteredItems = useMemo(
    () =>
      captures.filter((capture) =>
        activeFilter === "all" ? true : capture.state === activeFilter,
      ),
    [activeFilter, captures],
  );
  const filterCounts = useMemo(
    () => ({
      inbox: captures.filter((capture) => capture.state === "inbox").length,
      someday: captures.filter((capture) => capture.state === "someday").length,
      archived: captures.filter((capture) => capture.state === "archived").length,
      all: captures.length,
    }),
    [captures],
  );

  function setFilterFromShortcut(key: string) {
    if (key === "1") {
      setActiveFilter("inbox");
      return true;
    }

    if (key === "2") {
      setActiveFilter("someday");
      return true;
    }

    if (key === "3") {
      setActiveFilter("archived");
      return true;
    }

    if (key === "4") {
      setActiveFilter("all");
      return true;
    }

    return false;
  }

  useEffect(() => {
    if (!filteredItems.length) {
      setActiveCaptureId("");
      return;
    }

    if (!filteredItems.some((capture) => capture.id === activeCaptureId)) {
      setActiveCaptureId(filteredItems[0].id);
    }
  }, [activeCaptureId, filteredItems]);

  useEffect(() => {
    if (!activeCaptureId || pendingAction) {
      return;
    }

    tableRef.current?.focus({ preventScroll: true });

    const row = rowRefs.current.get(activeCaptureId);

    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [activeCaptureId, pendingAction]);

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

  function handleSubmitDraftCapture() {
    const text = draftValue.trim();

    if (!text) {
      return;
    }

    onCreateCapture(text);
    setDraftValue("");
    setDraftOpen(false);
    setDeleteChordArmed(false);
    setActiveFilter("inbox");
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (pendingAction || isTypingTarget(event.target)) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (setFilterFromShortcut(event.key)) {
        event.preventDefault();
        setDeleteChordArmed(false);
        return;
      }

      if (draftOpen) {
        return;
      }

      const activeCapture = filteredItems.find((capture) => capture.id === activeCaptureId);

      if (event.key === "Escape") {
        setDeleteChordArmed(false);
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setActiveFilter("inbox");
        setDraftOpen(true);
        setDraftValue("");
        setDeleteChordArmed(false);
        return;
      }

      if (deleteChordArmed && event.key.toLowerCase() !== "d") {
        setDeleteChordArmed(false);
      }

      if (event.key.toLowerCase() === "d") {
        if (!activeCapture) {
          return;
        }

        event.preventDefault();

        if (!deleteChordArmed) {
          setDeleteChordArmed(true);
          return;
        }

        setPendingAction({ type: "delete", capture: activeCapture });
        setDeleteChordArmed(false);
        return;
      }

      if (!activeCapture) {
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setPendingAction({ type: "task", capture: activeCapture });
        return;
      }

      if (event.key.toLowerCase() === "g") {
        event.preventDefault();
        setPendingAction({ type: "goal", capture: activeCapture });
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        setPendingAction({ type: "state", capture: activeCapture, nextState: "someday" });
        return;
      }

      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        setPendingAction({ type: "state", capture: activeCapture, nextState: "archived" });
        return;
      }

      const offset = captureListMotionOffsets[event.key as keyof typeof captureListMotionOffsets];

      if (!offset || !filteredItems.length) {
        return;
      }

      event.preventDefault();

      const currentIndex = filteredItems.findIndex((capture) => capture.id === activeCaptureId);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.max(0, Math.min(filteredItems.length - 1, startIndex + offset));
      setActiveCaptureId(filteredItems[nextIndex].id);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeCaptureId, deleteChordArmed, draftOpen, filteredItems, pendingAction]);

  return (
    <PageShell
      ariaLabel="Capture Inbox"
      eyebrow="Inbox"
      className="page--inbox"
      headerActions={
        <div className="inbox-filters" aria-label="Inbox filters">
          {inboxFilterDefinitions.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`inbox-filter ${activeFilter === filter.id ? "inbox-filter--active" : ""}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span>{filter.label}</span>
              <span className="inbox-filter__count" aria-hidden="true">
                {filterCounts[filter.id]}
              </span>
            </button>
          ))}
        </div>
      }
    >
      {filteredItems.length > 0 || draftOpen ? (
        <div className="inbox-table-wrap" aria-label="Captured thoughts">
          <table ref={tableRef} className="inbox-table" tabIndex={0}>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Created</th>
                <th scope="col">State</th>
                <th scope="col">Project</th>
                <th scope="col">Tags</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {draftOpen ? (
                <tr className="inbox-table__draft-row">
                  <td colSpan={6}>
                    <form
                      className="inbox-table__draft-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleSubmitDraftCapture();
                      }}
                    >
                      <input
                        className="inbox-table__draft-input"
                        aria-label="New capture text"
                        placeholder="Capture a thought"
                        value={draftValue}
                        autoFocus
                        onChange={(event) => setDraftValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleSubmitDraftCapture();
                            return;
                          }

                          if (event.key === "Escape") {
                            event.preventDefault();
                            setDraftValue("");
                            setDraftOpen(false);
                          }
                        }}
                      />
                    </form>
                  </td>
                </tr>
              ) : null}
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  ref={(element) => {
                    if (element) {
                      rowRefs.current.set(item.id, element);
                    } else {
                      rowRefs.current.delete(item.id);
                    }
                  }}
                  className={activeCaptureId === item.id ? "is-active" : ""}
                  aria-selected={activeCaptureId === item.id}
                  aria-label={item.text}
                  onMouseDown={() => setActiveCaptureId(item.id)}
                >
                  <td className="inbox-table__item-cell">
                    <div className="inbox-table__item-content">
                      <span className="inbox-item__marker" aria-hidden="true" />
                      <span className="inbox-item__text">{item.text}</span>
                    </div>
                  </td>
                  <td>{formatRelativeTimestamp(item.createdAt)}</td>
                  <td>{labelForState(item.state)}</td>
                  <td>{item.projectName || "None"}</td>
                  <td>{item.tags.length > 0 ? item.tags.join(", ") : "None"}</td>
                  <td className="inbox-table__actions-cell">
                    <div className="inbox-item__actions" aria-label="Inbox item actions">
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() => {
                          setActiveCaptureId(item.id);
                          setPendingAction({ type: "task", capture: item });
                        }}
                      >
                        Task
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() => {
                          setActiveCaptureId(item.id);
                          setPendingAction({ type: "goal", capture: item });
                        }}
                      >
                        Goal
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() => {
                          setActiveCaptureId(item.id);
                          setPendingAction({ type: "state", capture: item, nextState: "someday" });
                        }}
                      >
                        Someday
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() => {
                          setActiveCaptureId(item.id);
                          setPendingAction({
                            type: "state",
                            capture: item,
                            nextState: "archived",
                          });
                        }}
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() => {
                          setActiveCaptureId(item.id);
                          setPendingAction({ type: "delete", capture: item });
                        }}
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
          className="inbox-empty"
          badge="Inbox"
          title={emptyTitleForFilter(activeFilter)}
          copy={emptyCopyForFilter(activeFilter)}
        />
      )}

      {pendingAction ? (
        <InboxActionConfirmModal
          projects={projects}
          pendingAction={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={(projectId) => {
            if (pendingAction.type === "task") {
              onConvertCaptureToTask(pendingAction.capture.id, projectId);
              onNotify("Converted to task successfully.");
            }

            if (pendingAction.type === "goal") {
              onConvertCaptureToGoal(pendingAction.capture.id, projectId);
              onNotify("Converted to goal successfully.");
            }

            if (pendingAction.type === "state") {
              onUpdateCaptureState(pendingAction.capture.id, pendingAction.nextState);
              onNotify(
                `Moved to ${labelForState(pendingAction.nextState).toLowerCase()} successfully.`,
              );
            }

            if (pendingAction.type === "delete") {
              onDeleteCapture(pendingAction.capture.id);
              onNotify("Deleted successfully.");
            }

            setPendingAction(null);
          }}
        />
      ) : null}
    </PageShell>
  );
}

function labelForState(state: InboxCaptureState) {
  switch (state) {
    case "someday":
      return "Someday";
    case "archived":
      return "Archived";
    case "active":
      return "Processed";
    default:
      return "Inbox";
  }
}

function emptyTitleForFilter(filter: "all" | InboxCaptureState) {
  switch (filter) {
    case "someday":
      return "No someday captures";
    case "archived":
      return "No archived captures";
    case "all":
      return "No captures yet";
    default:
      return "No captured thoughts yet";
  }
}

function emptyCopyForFilter(filter: "all" | InboxCaptureState) {
  if (filter === "inbox") {
    return "Use `n i` to capture something from anywhere in the app.";
  }

  if (filter === "someday") {
    return "Move ideas here when they are worth keeping but not acting on yet.";
  }

  if (filter === "archived") {
    return "Archived capture items will appear here.";
  }

  return "Capture or process something to populate this view.";
}

function InboxActionConfirmModal({
  projects,
  pendingAction,
  onClose,
  onConfirm,
}: {
  projects: Array<{ id: string; name: string }>;
  pendingAction: PendingInboxAction;
  onClose: () => void;
  onConfirm: (projectId?: string) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const title =
    pendingAction.type === "task"
      ? "Turn into Task"
      : pendingAction.type === "goal"
        ? "Turn into Goal"
        : pendingAction.type === "state"
          ? `Move to ${labelForState(pendingAction.nextState)}`
          : "Delete item";
  const description =
    pendingAction.type === "task"
      ? "This will keep the original capture and create a linked task from it."
      : pendingAction.type === "goal"
        ? "This will keep the original capture and create a goal from it."
        : pendingAction.type === "state"
          ? `This will move the item into the ${labelForState(
              pendingAction.nextState,
            ).toLowerCase()} state.`
          : "This will permanently remove the item.";
  const needsProjectSelection = pendingAction.type === "task" || pendingAction.type === "goal";

  useEffect(() => {
    if (needsProjectSelection) {
      setSelectedProjectId(pendingAction.capture.projectId ?? "");
      return;
    }

    setSelectedProjectId("");
  }, [needsProjectSelection, pendingAction]);

  return (
    <Modal ariaLabelledBy="inbox-confirm-title" className="inbox-confirm" onClose={onClose}>
      <div className="inbox-confirm__content">
        <p id="inbox-confirm-title" className="new-task__title">
          {title}
        </p>
        <p className="inbox-confirm__item">{pendingAction.capture.text}</p>
        <p className="inbox-confirm__copy">{description}</p>
        {needsProjectSelection ? (
          <div className="ui-form-field">
            <span className="ui-form-field__header">
              <span className="ui-form-field__hint">Select project</span>
            </span>
            <div className="new-task__project-row" role="group" aria-label="Capture project options">
              <button
                type="button"
                className={`new-task__project-choice ${selectedProjectId === "" ? "is-active" : ""}`}
                onClick={() => setSelectedProjectId("")}
                aria-pressed={selectedProjectId === ""}
              >
                No project
              </button>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`new-task__project-choice ${
                    selectedProjectId === project.id ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedProjectId(project.id)}
                  aria-pressed={selectedProjectId === project.id}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <ActionBar className="inbox-confirm__actions">
          <button type="button" className="inbox-confirm__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="inbox-confirm__button inbox-confirm__button--confirm"
            onClick={() => onConfirm(selectedProjectId || undefined)}
          >
            Confirm
          </button>
        </ActionBar>
      </div>
    </Modal>
  );
}
