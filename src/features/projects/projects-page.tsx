import { useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "../../components/ui/action-bar";
import { EmptyState } from "../../components/ui/empty-state";
import { FormField } from "../../components/ui/form-field";
import { Modal } from "../../components/ui/modal";
import { PageShell } from "../../components/ui/page-shell";
import { formatRelativeTimestamp } from "../../lib/format-relative-timestamp";
import { createProjectBoardLaneId, defaultProjectBoardLanes } from "../../models/project-board";
import type { ProjectBoardLane } from "../../models/project-board";
import type { Item } from "../../models/workspace-item";
import type { Project } from "../../models/project";

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
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [activeLaneId, setActiveLaneId] = useState("");
  const [activeTaskId, setActiveTaskId] = useState("");
  const [pendingFocusedTaskId, setPendingFocusedTaskId] = useState("");
  const [draftTaskLaneId, setDraftTaskLaneId] = useState("");
  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const laneRefs = useRef(new Map<string, HTMLElement>());
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

  const activeLaneTasks = useMemo(
    () => laneGroups.get(activeLaneId) ?? [],
    [activeLaneId, laneGroups],
  );

  useEffect(() => {
    if (!boardLanes.length) {
      setActiveLaneId("");
      setDraftTaskLaneId("");
      setActiveTaskId("");
      return;
    }

    if (!boardLanes.some((lane) => lane.id === activeLaneId)) {
      setActiveLaneId(boardLanes[0].id);
    }
  }, [activeLaneId, boardLanes]);

  useEffect(() => {
    if (!activeLaneId) {
      setActiveTaskId("");
      return;
    }

    if (!activeLaneTasks.length) {
      setActiveTaskId("");
      return;
    }

    if (
      pendingFocusedTaskId &&
      activeLaneTasks.some((task) => task.id === pendingFocusedTaskId)
    ) {
      setActiveTaskId(pendingFocusedTaskId);
      setPendingFocusedTaskId("");
      return;
    }

    if (!activeLaneTasks.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(activeLaneTasks[0].id);
    }
  }, [activeLaneId, activeLaneTasks, activeTaskId, pendingFocusedTaskId]);

  useEffect(() => {
    if (!activeLaneId || laneModalOpen) {
      return;
    }

    const lane = laneRefs.current.get(activeLaneId);

    if (!lane) {
      return;
    }

    lane.focus();
    if (typeof lane.scrollIntoView === "function") {
      lane.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeLaneId, laneModalOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (laneModalOpen || !boardLanes.length) {
        return;
      }

      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("contenteditable") === "true" ||
          target.closest("[contenteditable]") !== null);

      if (isTypingTarget || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (draftTaskLaneId) {
        return;
      }

      if (event.key === "n") {
        if (!activeLaneId) {
          return;
        }

        event.preventDefault();
        setDraftTaskLaneId(activeLaneId);
        setDraftTaskTitle("");
        return;
      }

      if (event.key === "Enter") {
        if (!activeTaskId) {
          return;
        }

        event.preventDefault();
        onSelectTask(activeTaskId);
        return;
      }

      if ((event.key === "j" || event.key === "k") && activeLaneTasks.length) {
        event.preventDefault();

        const currentIndex = activeLaneTasks.findIndex((task) => task.id === activeTaskId);
        const startIndex = currentIndex >= 0 ? currentIndex : 0;
        const offset = event.key === "j" ? 1 : -1;
        const nextIndex = Math.max(
          0,
          Math.min(activeLaneTasks.length - 1, startIndex + offset),
        );
        setActiveTaskId(activeLaneTasks[nextIndex].id);
        return;
      }

      const isPreviousLaneMotion =
        event.key === "h" ||
        event.key === "ArrowLeft" ||
        (event.key === "Tab" && event.shiftKey);
      const isNextLaneMotion =
        event.key === "l" ||
        event.key === "ArrowRight" ||
        (event.key === "Tab" && !event.shiftKey);

      if (!isPreviousLaneMotion && !isNextLaneMotion) {
        return;
      }

      event.preventDefault();

      const currentIndex = boardLanes.findIndex((lane) => lane.id === activeLaneId);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const offset = isPreviousLaneMotion ? -1 : 1;
      const nextIndex = (startIndex + offset + boardLanes.length) % boardLanes.length;
      setActiveLaneId(boardLanes[nextIndex].id);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeLaneId,
    activeLaneTasks,
    activeTaskId,
    boardLanes,
    draftTaskLaneId,
    laneModalOpen,
    onSelectTask,
  ]);

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
