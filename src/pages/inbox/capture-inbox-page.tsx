import { useMemo, useState } from "react";
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

export function CaptureInboxPage({
  captures,
  onConvertCaptureToTask,
  onConvertCaptureToGoal,
  onUpdateCaptureState,
  onDeleteCapture,
  onNotify,
}: {
  captures: InboxCaptureView[];
  onConvertCaptureToTask: (captureId: string) => void;
  onConvertCaptureToGoal: (captureId: string) => void;
  onUpdateCaptureState: (captureId: string, state: InboxCaptureState) => void;
  onDeleteCapture: (captureId: string) => void;
  onNotify: (message: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<"all" | InboxCaptureState>("inbox");
  const [pendingAction, setPendingAction] = useState<PendingInboxAction | null>(null);
  const filteredItems = useMemo(
    () =>
      captures.filter((capture) =>
        activeFilter === "all" ? true : capture.state === activeFilter,
      ),
    [activeFilter, captures],
  );

  return (
    <PageShell
      ariaLabel="Capture Inbox"
      eyebrow="Inbox"
      className="page--inbox"
      headerActions={
        <div className="inbox-filters" aria-label="Inbox filters">
          <button
            type="button"
            className={`inbox-filter ${activeFilter === "inbox" ? "inbox-filter--active" : ""}`}
            onClick={() => setActiveFilter("inbox")}
          >
            Inbox
          </button>
          <button
            type="button"
            className={`inbox-filter ${activeFilter === "someday" ? "inbox-filter--active" : ""}`}
            onClick={() => setActiveFilter("someday")}
          >
            Someday
          </button>
          <button
            type="button"
            className={`inbox-filter ${activeFilter === "archived" ? "inbox-filter--active" : ""}`}
            onClick={() => setActiveFilter("archived")}
          >
            Archived
          </button>
          <button
            type="button"
            className={`inbox-filter ${activeFilter === "all" ? "inbox-filter--active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </button>
        </div>
      }
    >
      {filteredItems.length > 0 ? (
        <div className="inbox-table-wrap" aria-label="Captured thoughts">
          <table className="inbox-table">
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
              {filteredItems.map((item) => (
                <tr key={item.id}>
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
                        onClick={() => setPendingAction({ type: "task", capture: item })}
                      >
                        Task
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() => setPendingAction({ type: "goal", capture: item })}
                      >
                        Goal
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() =>
                          setPendingAction({ type: "state", capture: item, nextState: "someday" })
                        }
                      >
                        Someday
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() =>
                          setPendingAction({ type: "state", capture: item, nextState: "archived" })
                        }
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        className="inbox-action"
                        onClick={() => setPendingAction({ type: "delete", capture: item })}
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
          pendingAction={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            if (pendingAction.type === "task") {
              onConvertCaptureToTask(pendingAction.capture.id);
              onNotify("Converted to task successfully.");
            }

            if (pendingAction.type === "goal") {
              onConvertCaptureToGoal(pendingAction.capture.id);
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
  pendingAction,
  onClose,
  onConfirm,
}: {
  pendingAction: PendingInboxAction;
  onClose: () => void;
  onConfirm: () => void;
}) {
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

  return (
    <Modal ariaLabelledBy="inbox-confirm-title" className="inbox-confirm" onClose={onClose}>
      <div className="inbox-confirm__content">
        <p id="inbox-confirm-title" className="new-task__title">
          {title}
        </p>
        <p className="inbox-confirm__item">{pendingAction.capture.text}</p>
        <p className="inbox-confirm__copy">{description}</p>
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
