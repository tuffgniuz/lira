import { viewTitles } from "../../app/navigation";
import type { ViewId } from "../../app/types";
import { Card } from "../../components/card";
import type { Item } from "../../models/item";
import type { JournalEntry, JournalEntrySummary } from "../../models/journal";
import type { Project } from "../../models/project";
import { CaptureInboxPage } from "../inbox/capture-inbox-page";
import { JournalingPage } from "../journaling/journaling-page";
import { GoalsPage } from "../goals/goals-page";
import { ProjectsPage } from "../projects/projects-page";
import { TasksPage } from "../tasks/tasks-page";

type PageContentProps = {
  activeView: ViewId;
  items: Item[];
  todayDate: string;
  journalSummaries: JournalEntrySummary[];
  selectedJournalDate: string;
  journalEntry: JournalEntry;
  todayJournalEntry: JournalEntry;
  projects: Project[];
  selectedProjectId: string;
  selectedGoalId: string;
  selectedTaskId: string;
  onSelectProject: (projectId: string) => void;
  onSelectGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Item>) => void;
  onDeleteGoal: (goalId: string) => void;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateJournalEntry: (updates: Partial<JournalEntry>) => void;
  onSelectJournalDate: (date: string) => void;
  onTransformItem: (itemId: string, kind: Item["kind"]) => void;
  onUpdateItemState: (itemId: string, state: Item["state"]) => void;
  onDeleteItem: (itemId: string) => void;
  onNotify: (message: string) => void;
};

export function PageContent({
  activeView,
  items,
  todayDate,
  journalSummaries,
  selectedJournalDate,
  journalEntry,
  todayJournalEntry,
  projects,
  selectedProjectId,
  selectedGoalId,
  selectedTaskId,
  onSelectProject,
  onSelectGoal,
  onUpdateGoal,
  onDeleteGoal,
  onSelectTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateProject,
  onDeleteProject,
  onUpdateJournalEntry,
  onSelectJournalDate,
  onTransformItem,
  onUpdateItemState,
  onDeleteItem,
  onNotify,
}: PageContentProps) {
  if (activeView === "dashboard") {
    return (
      <section className="page page--dashboard" aria-label="Dashboard">
        <h1 className="home-greeting">{getGreetingForTime(new Date())}</h1>
        {todayJournalEntry.morningIntention.trim() ? (
          <Card as="article" className="home-intention-card" aria-label="Today's intention">
            <p className="home-intention-card__label">Today&apos;s intention</p>
            <p className="home-intention-card__body">{todayJournalEntry.morningIntention}</p>
          </Card>
        ) : null}
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
        projects={projects}
        journalSummaries={journalSummaries}
        todayDate={todayDate}
        selectedGoalId={selectedGoalId}
        onSelectGoal={onSelectGoal}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={onDeleteGoal}
      />
    );
  }

  if (activeView === "tasks") {
    return (
      <TasksPage
        items={items}
        projects={projects}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    );
  }

  if (activeView === "journaling") {
    return (
      <JournalingPage
        todayDate={todayDate}
        selectedDate={selectedJournalDate}
        entry={journalEntry}
        entries={journalSummaries}
        items={items}
        onSelectDate={onSelectJournalDate}
        onUpdateEntry={onUpdateJournalEntry}
      />
    );
  }

  if (activeView === "projects") {
    return (
      <ProjectsPage
        projects={projects}
        items={items}
        journalSummaries={journalSummaries}
        todayDate={todayDate}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
        onUpdateProject={onUpdateProject}
        onDeleteProject={onDeleteProject}
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
