import { useMemo, useState } from "react";
import { ActionBar } from "@/components/actions/action-bar";
import { EmptyState } from "@/components/feedback/empty-state";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";
import { PageShell } from "@/components/layout/page-shell";
import { useProjectBoardNavigation } from "@/lib/hooks/use-project-board-navigation";
import { formatRelativeTimestamp } from "@/lib/utils/format-relative-timestamp";
import { createProjectBoardLaneId, defaultProjectBoardLanes } from "@/models/project-board";
import type { ProjectBoardLane } from "@/models/project-board";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";

type ProjectsPageProps = {
  projects: Project[];
  items: Item[];
  selectedProjectId: string;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onCreateTask: (task: {
    title: string;
    description: string;
    projectId: string;
    goalId: string;
    projectLaneId?: string;
    openDetailOnSuccess?: boolean;
  }) => string | undefined;
  onSelectTask: (taskId: string) => void;
};

export function ProjectsPage({
  projects,
  items,
  selectedProjectId,
  onUpdateProject,
  onUpdateTask,
  onCreateTask,
  onSelectTask,
}: ProjectsPageProps) {
  const [newLaneName, setNewLaneName] = useState("");
  const [laneModalOpen, setLaneModalOpen] = useState(false);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;

  const boardLanes = selectedProject?.boardLanes.length
    ? selectedProject.boardLanes
    : selectedProject
      ? defaultProjectBoardLanes(selectedProject.id)
      : [];

  const projectTasks = useMemo(
    () =>
      items.filter(
        (item) =>
          item.kind === "task" &&
          item.projectId === selectedProject?.id &&
          item.state !== "deleted",
      ),
    [items, selectedProject?.id],
  );

  const laneGroups = useMemo(() => {
    const defaultLaneId = boardLanes[0]?.id;
    const initialGroups = new Map(boardLanes.map((lane) => [lane.id, [] as Item[]]));

    for (const task of projectTasks) {
      const laneId =
        task.projectLaneId && initialGroups.has(task.projectLaneId)
          ? task.projectLaneId
          : defaultLaneId;

      if (!laneId) {
        continue;
      }

      initialGroups.get(laneId)?.push(task);
    }

    for (const group of initialGroups.values()) {
      group.sort((left, right) => {
        const createdComparison = right.createdAt.localeCompare(left.createdAt);

        if (createdComparison !== 0) {
          return createdComparison;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
    }

    return initialGroups;
  }, [boardLanes, projectTasks]);
  const {
    activeLaneId,
    activeTaskId,
    draftTaskLaneId,
    draftTaskTitle,
    draggingTaskId,
    laneRefs,
    setActiveLaneId,
    setActiveTaskId,
    setDraftTaskLaneId,
    setDraftTaskTitle,
    setDraggingTaskId,
    setPendingFocusedTaskId,
  } = useProjectBoardNavigation({
    boardLanes,
    laneGroups,
    laneModalOpen,
    onSelectTask,
  });

  if (!selectedProject) {
    return (
      <EmptyState
        className="projects-empty"
        badge="Projects"
        title="No projects yet"
        copy="Use `Space n p` to create your first project."
      />
    );
  }

  function handleCreateLane() {
    const trimmedName = newLaneName.trim();

    if (!trimmedName) {
      return;
    }

    const nextLane: ProjectBoardLane = {
      id: createProjectBoardLaneId(selectedProject.id, trimmedName),
      name: trimmedName,
      order: boardLanes.length,
    };

    onUpdateProject(selectedProject.id, {
      boardLanes: [...boardLanes, nextLane],
    });
    setNewLaneName("");
    setLaneModalOpen(false);
  }

  function handleSubmitDraftTask() {
    const trimmedTitle = draftTaskTitle.trim();

    if (!trimmedTitle || !selectedProject || !draftTaskLaneId) {
      return;
    }

    const createdTaskId = onCreateTask({
      title: trimmedTitle,
      description: "",
      goalId: "",
      projectId: selectedProject.id,
      projectLaneId: draftTaskLaneId,
      openDetailOnSuccess: false,
    });
    setActiveLaneId(draftTaskLaneId);
    if (createdTaskId) {
      setPendingFocusedTaskId(createdTaskId);
      setActiveTaskId(createdTaskId);
    }
    setDraftTaskTitle("");
    setDraftTaskLaneId("");
  }

  return (
    <PageShell ariaLabel="Projects" className="page--projects-board">
      <div className="projects-board-main">
        <header className="projects-board-header">
          <div>
            <p className="page__eyebrow">Project board</p>
            <h1 className="projects-board-header__title">{selectedProject.name}</h1>
            <p className="projects-board-header__copy">
              {selectedProject.description || "No description yet."}
            </p>
          </div>
          <ActionBar className="projects-board-header__actions">
            <button
              type="button"
              className="projects-board-header__button"
              onClick={() => setLaneModalOpen(true)}
            >
              Add lane
            </button>
          </ActionBar>
        </header>

        <div className="projects-board" aria-label={`${selectedProject.name} board`}>
          {boardLanes.map((lane) => (
            <section
              key={lane.id}
              ref={(element) => {
                if (element) {
                  laneRefs.current.set(lane.id, element);
                } else {
                  laneRefs.current.delete(lane.id);
                }
              }}
              className={`projects-board-lane ${
                activeLaneId === lane.id ? "is-focused" : ""
              } ${draggingTaskId ? "is-drop-ready" : ""}`.trim()}
              aria-label={`${lane.name} lane`}
              tabIndex={activeLaneId === lane.id ? 0 : -1}
              onFocus={() => setActiveLaneId(lane.id)}
              onMouseDown={() => setActiveLaneId(lane.id)}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;

                if (!taskId) {
                  return;
                }

                onUpdateTask(taskId, { projectLaneId: lane.id });
                setDraggingTaskId("");
              }}
            >
              <header className="projects-board-lane__header">
                <div className="projects-board-lane__heading">
                  <h2 className="projects-board-lane__title">{lane.name}</h2>
                  {activeLaneId === lane.id ? (
                    <span className="projects-board-lane__focus-dot" aria-hidden="true" />
                  ) : null}
                </div>
                <span className="projects-board-lane__count">
                  {laneGroups.get(lane.id)?.length ?? 0}
                </span>
              </header>

              <div className="projects-board-lane__cards">
                {draftTaskLaneId === lane.id ? (
                  <form
                    className="projects-board-card projects-board-card--draft"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmitDraftTask();
                    }}
                  >
                    <input
                      className="projects-board-card__input"
                      aria-label="New task title"
                      placeholder="New task"
                      value={draftTaskTitle}
                      autoFocus
                      onChange={(event) => setDraftTaskTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                          handleSubmitDraftTask();
                          return;
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          event.stopPropagation();
                          setDraftTaskTitle("");
                          setDraftTaskLaneId("");
                          setActiveLaneId(lane.id);
                        }
                      }}
                    />
                  </form>
                ) : null}
                {(laneGroups.get(lane.id) ?? []).map((task) => (
                  <article
                    key={task.id}
                    className={`projects-board-card ${
                      activeLaneId === lane.id && activeTaskId === task.id ? "is-focused" : ""
                    }`.trim()}
                    aria-label={`Task card ${task.title}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", task.id);
                      setDraggingTaskId(task.id);
                    }}
                    onDragEnd={() => setDraggingTaskId("")}
                  >
                    <p className="projects-board-card__timestamp">
                      {formatTaskTimestampLabel(task)}
                    </p>
                    <p className="projects-board-card__title">{task.title}</p>
                    {task.content.trim() ? (
                      <p className="projects-board-card__copy">{task.content}</p>
                    ) : null}
                    {task.priority || task.dueDate ? (
                      <div className="projects-board-card__meta" aria-label="Task metadata">
                        {task.priority ? (
                          <span className="projects-board-card__meta-item">
                            {task.priority.toUpperCase()}
                          </span>
                        ) : null}
                        {task.dueDate ? (
                          <span className="projects-board-card__meta-item">
                            {`DUE ${task.dueDate}`}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {laneModalOpen ? (
        <Modal
          ariaLabelledBy="create-project-lane-title"
          className="confirm-panel"
          onClose={() => {
            setLaneModalOpen(false);
            setNewLaneName("");
          }}
        >
          <div className="confirm-panel__content">
            <p id="create-project-lane-title" className="confirm-panel__title">
              Add lane
            </p>
            <FormField label="Lane name">
              <input
                className="ui-input"
                aria-label="Lane name"
                value={newLaneName}
                onChange={(event) => setNewLaneName(event.target.value)}
              />
            </FormField>
            <ActionBar className="confirm-panel__actions">
              <button
                type="button"
                className="confirm-panel__button"
                onClick={handleCreateLane}
              >
                Create lane
              </button>
            </ActionBar>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}

function formatTaskTimestampLabel(task: Item) {
  const timestampPrefix = task.updatedAt !== task.createdAt ? "UPDATED" : "CREATED";
  const timestampValue = formatRelativeTimestamp(
    task.updatedAt !== task.createdAt ? task.updatedAt : task.createdAt,
  );

  return `${timestampPrefix} ${timestampValue.toUpperCase()}`;
}
