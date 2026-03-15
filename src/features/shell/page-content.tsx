import { viewTitles } from "../../app/navigation";
import type { ViewId } from "../../app/types";
import type { Item } from "../../models/item";
import { CaptureInboxPage } from "../inbox/capture-inbox-page";
import { GoalsPage } from "../goals/goals-page";
import { TasksPage } from "../tasks/tasks-page";

type PageContentProps = {
  activeView: ViewId;
  items: Item[];
  selectedGoalId: string;
  selectedTaskId: string;
  onSelectGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Item>) => void;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onTransformItem: (itemId: string, kind: Item["kind"]) => void;
  onUpdateItemState: (itemId: string, state: Item["state"]) => void;
  onDeleteItem: (itemId: string) => void;
  onNotify: (message: string) => void;
};

export function PageContent({
  activeView,
  items,
  selectedGoalId,
  selectedTaskId,
  onSelectGoal,
  onUpdateGoal,
  onSelectTask,
  onUpdateTask,
  onTransformItem,
  onUpdateItemState,
  onDeleteItem,
  onNotify,
}: PageContentProps) {
  if (activeView === "dashboard") {
    return (
      <section className="page page--dashboard" aria-label="Dashboard">
        <h1 className="home-greeting">{getGreetingForTime(new Date())}</h1>
      </section>
    );
  }

  if (activeView === "inbox") {
    return (
      <CaptureInboxPage
        inboxItems={items.filter(
          (item) => item.sourceType === "capture" && item.state !== "deleted",
        )}
        onTransformItem={onTransformItem}
        onUpdateItemState={onUpdateItemState}
        onDeleteItem={onDeleteItem}
        onNotify={onNotify}
      />
    );
  }

  if (activeView === "goals") {
    return (
      <GoalsPage
        items={items}
        selectedGoalId={selectedGoalId}
        onSelectGoal={onSelectGoal}
        onUpdateGoal={onUpdateGoal}
      />
    );
  }

  if (activeView === "tasks") {
    return (
      <TasksPage
        items={items}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
      />
    );
  }

  return (
    <section className="page page--placeholder" aria-label={viewTitles[activeView]}>
      <div className="page__header">
        <p className="page__eyebrow">Workspace</p>
        <h1 className="page__title">{viewTitles[activeView]}</h1>
      </div>
      <p className="page__placeholder-copy">{viewTitles[activeView]} will live here next.</p>
    </section>
  );
}

function getGreetingForTime(date: Date) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}
