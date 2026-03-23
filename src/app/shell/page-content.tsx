import { viewTitles } from "@/app/navigation/navigation";
import type { ViewId } from "@/app/navigation/types";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import type { Doc } from "@/models/doc";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";
import { CaptureInboxPage } from "@/pages/inbox/capture-inbox-page";
import { DocDetailPage } from "@/pages/docs/doc-detail-page";
import { buildInboxCaptureViews } from "@/pages/inbox/inbox-capture-view";
import { GoalsPage } from "@/pages/goals/goals-page";
import { ProjectsPage } from "@/pages/projects/projects-page";
import { TaskDetailPage } from "@/pages/tasks/task-detail-page";
import { TasksPage } from "@/pages/tasks/tasks-page";

type PageContentProps = {
  activeView: ViewId;
  items: Item[];
  docs: Doc[];
  todayDate: string;
  projects: Project[];
  selectedProjectId: string;
  selectedGoalId: string;
  selectedTaskId: string;
  selectedDocId: string;
  onSelectGoal: (goalId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Item>) => void;
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goalId: string) => void;
  onCreateTask: (task: {
    title: string;
    description: string;
    projectId: string;
    goalId: string;
    projectLaneId?: string;
    isCompleted?: boolean;
    openDetailOnSuccess?: boolean;
  }) => string | undefined;
  onSelectTask: (taskId: string) => void;
  onOpenProjectTask: (taskId: string) => void;
  onCloseTaskDetail: (view: "tasks" | "projects") => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onCloseDocDetail: () => void;
  onUpdateDoc: (docId: string, updates: Partial<Doc>) => void;
  onDeleteDoc: (docId: string) => void;
  onUpdateProject: (
    projectId: string,
    updates: Partial<Project>,
  ) => void | boolean | Promise<void | boolean>;
  onCreateCapture: (value: string) => void;
  onConvertCaptureToTask: (captureId: string, projectId?: string) => void;
  onConvertCaptureToGoal: (captureId: string, projectId?: string) => void;
  onUpdateCaptureState: (
    captureId: string,
    state: Extract<Item["state"], "inbox" | "someday" | "active" | "archived">,
  ) => void;
  onDeleteCapture: (captureId: string) => void;
  onNotify: (message: string) => void;
  taskDraftResetKeys: Record<string, number>;
  docDraftResetKeys: Record<string, number>;
};

export function PageContent({
  activeView,
  items,
  docs,
  todayDate,
  projects,
  selectedProjectId,
  selectedGoalId,
  selectedTaskId,
  selectedDocId,
  onSelectGoal,
  onUpdateGoal,
  onDeleteGoal,
  onEditGoal,
  onCreateTask,
  onSelectTask,
  onOpenProjectTask,
  onCloseTaskDetail,
  onUpdateTask,
  onDeleteTask,
  onCloseDocDetail,
  onUpdateDoc,
  onDeleteDoc,
  onUpdateProject,
  onCreateCapture,
  onConvertCaptureToTask,
  onConvertCaptureToGoal,
  onUpdateCaptureState,
  onDeleteCapture,
  onNotify,
  taskDraftResetKeys,
  docDraftResetKeys,
}: PageContentProps) {
  if (activeView === "dashboard") {
    return (
      <PageShell ariaLabel="Dashboard" className="page--dashboard">
        <h1 className="home-greeting">{getGreetingForTime(new Date())}</h1>
      </PageShell>
    );
  }

  if (activeView === "inbox") {
    return (
      <CaptureInboxPage
        captures={buildInboxCaptureViews(items, projects)}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        onCreateCapture={onCreateCapture}
        onConvertCaptureToTask={onConvertCaptureToTask}
        onConvertCaptureToGoal={onConvertCaptureToGoal}
        onUpdateCaptureState={onUpdateCaptureState}
        onDeleteCapture={onDeleteCapture}
        onNotify={onNotify}
      />
    );
  }

  if (activeView === "goals") {
    return (
      <GoalsPage
        items={items}
        projects={projects}
        todayDate={todayDate}
        selectedGoalId={selectedGoalId}
        onSelectGoal={onSelectGoal}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={onDeleteGoal}
        onEditGoal={onEditGoal}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onNotify={onNotify}
      />
    );
  }

  if (activeView === "tasks") {
    const selectedTask =
      items.find((item) => item.id === selectedTaskId && item.kind === "task") ?? null;

    return (
      selectedTaskId ? (
        selectedTask ? (
          <TaskDetailPage
            task={selectedTask}
            projects={projects}
            onBack={() => onCloseTaskDetail("tasks")}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onNotify={onNotify}
            draftResetKey={taskDraftResetKeys[selectedTask.id] ?? 0}
          />
        ) : (
          <TasksPage
            items={items}
            projects={projects}
            onSelectTask={onSelectTask}
            onDeleteTask={onDeleteTask}
            onNotify={onNotify}
          />
        )
      ) : (
        <TasksPage
          items={items}
          projects={projects}
          onSelectTask={onSelectTask}
          onDeleteTask={onDeleteTask}
          onNotify={onNotify}
        />
      )
    );
  }

  if (activeView === "projects") {
    const selectedTask =
      items.find((item) => item.id === selectedTaskId && item.kind === "task") ?? null;

    return (
      selectedTaskId ? (
        selectedTask ? (
          <TaskDetailPage
            task={selectedTask}
            projects={projects}
            eyebrow="Projects"
            backLabel="Back to project board"
            onBack={() => onCloseTaskDetail("projects")}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onNotify={onNotify}
            draftResetKey={taskDraftResetKeys[selectedTask.id] ?? 0}
          />
        ) : (
          <ProjectsPage
            projects={projects}
            items={items}
            todayDate={todayDate}
            selectedProjectId={selectedProjectId}
            onUpdateProject={onUpdateProject}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onNotify={onNotify}
            onCreateTask={onCreateTask}
            onSelectTask={onOpenProjectTask}
          />
        )
      ) : (
        <ProjectsPage
          projects={projects}
          items={items}
          todayDate={todayDate}
          selectedProjectId={selectedProjectId}
          onUpdateProject={onUpdateProject}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onNotify={onNotify}
          onCreateTask={onCreateTask}
          onSelectTask={onOpenProjectTask}
        />
      )
    );
  }

  if (activeView === "docs") {
    const selectedDoc = docs.find((doc) => doc.id === selectedDocId) ?? null;

    return selectedDoc ? (
      <DocDetailPage
        doc={selectedDoc}
        projects={projects}
        onBack={onCloseDocDetail}
        onUpdateDoc={onUpdateDoc}
        onDeleteDoc={onDeleteDoc}
        onNotify={onNotify}
        draftResetKey={docDraftResetKeys[selectedDoc.id] ?? 0}
      />
    ) : (
      <PageShell
        ariaLabel="Docs"
        eyebrow="Workspace"
        title="Docs"
        className="page--placeholder"
      >
        <EmptyState
          title="No doc is open"
          copy="Open a doc from the docs palette or create one with the new-doc shortcut."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      ariaLabel={viewTitles[activeView]}
      eyebrow="Workspace"
      title={viewTitles[activeView]}
      className="page--placeholder"
    >
      <EmptyState
        title={`${viewTitles[activeView]} will live here next`}
        copy="This screen is still a placeholder."
      />
    </PageShell>
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
