import { viewTitles } from "@/app/navigation/navigation";
import type { ViewId } from "@/app/navigation/types";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";
import { CaptureInboxPage } from "@/pages/inbox/capture-inbox-page";
import { buildInboxCaptureViews } from "@/pages/inbox/inbox-capture-view";
import { GoalsPage } from "@/pages/goals/goals-page";
import { ProjectsPage } from "@/pages/projects/projects-page";
import { TaskDetailPage } from "@/pages/tasks/task-detail-page";
import { TasksPage } from "@/pages/tasks/tasks-page";

type PageContentProps = {
  activeView: ViewId;
  items: Item[];
  todayDate: string;
  projects: Project[];
  selectedProjectId: string;
  selectedGoalId: string;
  selectedTaskId: string;
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
    openDetailOnSuccess?: boolean;
  }) => string | undefined;
  onSelectTask: (taskId: string) => void;
  onOpenProjectTask: (taskId: string) => void;
  onCloseTaskDetail: (view: "tasks" | "projects") => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onCreateCapture: (value: string) => void;
  onConvertCaptureToTask: (captureId: string, projectId?: string) => void;
  onConvertCaptureToGoal: (captureId: string, projectId?: string) => void;
  onUpdateCaptureState: (
    captureId: string,
    state: Extract<Item["state"], "inbox" | "someday" | "active" | "archived">,
  ) => void;
  onDeleteCapture: (captureId: string) => void;
  onNotify: (message: string) => void;
};

export function PageContent({
  activeView,
  items,
  todayDate,
  projects,
  selectedProjectId,
  selectedGoalId,
  selectedTaskId,
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
  onUpdateProject,
  onCreateCapture,
  onConvertCaptureToTask,
  onConvertCaptureToGoal,
  onUpdateCaptureState,
  onDeleteCapture,
  onNotify,
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
