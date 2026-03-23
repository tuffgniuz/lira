import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { ActionBar } from "@/components/actions/action-bar";
import { EditIcon } from "@/components/icons";
import { EmptyState } from "@/components/feedback/empty-state";
import { FormField } from "@/components/data-input/form-field";
import { Modal } from "@/components/actions/modal";
import { RightRailColumn } from "@/components/layout/right-rail-column";
import { PageShell } from "@/components/layout/page-shell";
import { ThreeColumnLayout } from "@/components/layout/three-column-layout";
import { useProjectBoardNavigation } from "@/lib/hooks/use-project-board-navigation";
import { useWindowWidth } from "@/lib/hooks/use-window-width";
import { formatRelativeTimestamp } from "@/lib/utils/format-relative-timestamp";
import { createProjectBoardLaneId, defaultProjectBoardLanes } from "@/models/project-board";
import type { ProjectBoardLane } from "@/models/project-board";
import type { Item } from "@/models/workspace-item";
import type {
  Project,
  ProjectTaskTemplateField,
  ProjectTaskTemplateFieldType,
} from "@/models/project";

type ProjectsPageProps = {
  projects: Project[];
  items: Item[];
  todayDate: string;
  selectedProjectId: string;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Item>) => void;
  onDeleteTask: (taskId: string) => void;
  onNotify: (message: string) => void;
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

const projectTaskListMotionOffsets = {
  j: 1,
  k: -1,
  ArrowDown: 1,
  ArrowUp: -1,
} as const satisfies Record<string, 1 | -1>;

const projectListFilterDefinitions = [
  { id: "todo", label: "To do" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
] as const;

const taskTemplateFieldTypeOptions: Array<{
  value: ProjectTaskTemplateFieldType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "boolean", label: "Boolean" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

function createEmptyTaskTemplateField(): ProjectTaskTemplateField {
  return {
    id: `project-task-template-field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key: "",
    label: "",
    type: "text",
  };
}

function normalizeTaskTemplateKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

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

function formatPriorityLabel(priority: Item["priority"]) {
  if (!priority) {
    return "None";
  }

  return `${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;
}

export function ProjectsPage({
  projects,
  items,
  todayDate,
  selectedProjectId,
  onUpdateProject,
  onUpdateTask,
  onDeleteTask,
  onNotify,
  onCreateTask,
  onSelectTask,
}: ProjectsPageProps) {
  const windowWidth = useWindowWidth();
  const [activeListFilter, setActiveListFilter] = useState<"todo" | "completed" | "all">("todo");
  const [newLaneName, setNewLaneName] = useState("");
  const [laneModalOpen, setLaneModalOpen] = useState(false);
  const [taskTemplateModalOpen, setTaskTemplateModalOpen] = useState(false);
  const [taskTemplateDraftFields, setTaskTemplateDraftFields] = useState<ProjectTaskTemplateField[]>(
    [],
  );
  const [pendingTaskTemplateFocusIndex, setPendingTaskTemplateFocusIndex] = useState<number | null>(
    null,
  );
  const [liftedTaskId, setLiftedTaskId] = useState("");
  const [listDraftOpen, setListDraftOpen] = useState(false);
  const [listDraftTitle, setListDraftTitle] = useState("");
  const [activeListTaskId, setActiveListTaskId] = useState("");
  const [deleteChordArmed, setDeleteChordArmed] = useState(false);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
  const showRightRail = windowWidth >= 900;

  const boardLanes = selectedProject?.hasKanbanBoard
    ? selectedProject.boardLanes.length
      ? selectedProject.boardLanes
      : selectedProject
        ? defaultProjectBoardLanes(selectedProject.id)
        : []
    : [];

  const projectTasks = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.kind === "task" &&
            item.projectId === selectedProject?.id &&
            item.state !== "deleted",
        )
        .sort((left, right) => {
          const createdComparison = right.createdAt.localeCompare(left.createdAt);

          if (createdComparison !== 0) {
            return createdComparison;
          }

          return right.updatedAt.localeCompare(left.updatedAt);
        }),
    [items, selectedProject?.id],
  );

  const projectListCounts = useMemo(
    () => ({
      todo: projectTasks.filter((task) => !task.isCompleted).length,
      completed: projectTasks.filter((task) => task.isCompleted).length,
      all: projectTasks.length,
    }),
    [projectTasks],
  );

  const filteredProjectTasks = useMemo(
    () =>
      projectTasks.filter((task) => {
        if (activeListFilter === "completed") {
          return task.isCompleted;
        }

        if (activeListFilter === "todo") {
          return !task.isCompleted;
        }

        return true;
      }),
    [activeListFilter, projectTasks],
  );

  const projectListRows = useMemo(
    () =>
      filteredProjectTasks.map((task) => ({
        id: task.id,
        title: task.title,
        createdAt: formatRelativeTimestamp(task.createdAt),
        due: task.dueDate || "None",
        priority: formatPriorityLabel(task.priority),
        isCompleted: task.isCompleted,
      })),
    [filteredProjectTasks],
  );

  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const listTableRef = useRef<HTMLTableElement | null>(null);
  const templateFieldInputRefs = useRef<{
    labels: Array<HTMLInputElement | null>;
    types: Array<HTMLSelectElement | null>;
  }>({
    labels: [],
    types: [],
  });
  const activeTaskTemplateControlRef = useRef<{
    fieldId: string;
    control: "label" | "type";
  } | null>(null);
  const addTemplateFieldButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveTemplateButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousTaskTemplateModalOpenRef = useRef(false);
  const boardInteractionStateRef = useRef({
    activeLaneId: "",
    activeTaskId: "",
    draftTaskLaneId: "",
    laneModalOpen: false,
    hasKanbanBoard: false,
    boardLanes: [] as ProjectBoardLane[],
  });

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

  useEffect(() => {
    if (selectedProject?.hasKanbanBoard) {
      setActiveListFilter("todo");
    }
  }, [selectedProject?.hasKanbanBoard]);

  useEffect(() => {
    if (selectedProject?.hasKanbanBoard) {
      setListDraftOpen(false);
      setListDraftTitle("");
    }
  }, [selectedProject?.hasKanbanBoard]);

  useLayoutEffect(() => {
    const wasOpen = previousTaskTemplateModalOpenRef.current;
    previousTaskTemplateModalOpenRef.current = taskTemplateModalOpen;

    if (!wasOpen && taskTemplateModalOpen) {
      const activeControl = activeTaskTemplateControlRef.current;
      const firstFieldId = taskTemplateDraftFields[0]?.id;
      const targetFieldId = activeControl?.fieldId ?? firstFieldId;
      const targetControl = activeControl?.control ?? "label";

      if (!targetFieldId) {
        return;
      }

      focusTaskTemplateFieldById(targetFieldId, targetControl);
    }
  }, [taskTemplateDraftFields, taskTemplateModalOpen]);

  useLayoutEffect(() => {
    if (pendingTaskTemplateFocusIndex === null) {
      return;
    }

    templateFieldInputRefs.current.labels[pendingTaskTemplateFocusIndex]?.focus();
    setPendingTaskTemplateFocusIndex(null);
  }, [pendingTaskTemplateFocusIndex, taskTemplateDraftFields]);



  useEffect(() => {
    if (!selectedProject?.hasKanbanBoard) {
      setLiftedTaskId("");
    }
  }, [selectedProject?.hasKanbanBoard]);

  useEffect(() => {
    if (selectedProject?.hasKanbanBoard) {
      setActiveListTaskId("");
      return;
    }

    if (!projectListRows.length) {
      setActiveListTaskId("");
      return;
    }

    if (!projectListRows.some((row) => row.id === activeListTaskId)) {
      setActiveListTaskId(projectListRows[0].id);
    }
  }, [activeListTaskId, projectListRows, selectedProject?.hasKanbanBoard]);

  useEffect(() => {
    if (!activeListTaskId || selectedProject?.hasKanbanBoard) {
      return;
    }

    const row = rowRefs.current.get(activeListTaskId);

    if (listDraftOpen) {
      return;
    }

    listTableRef.current?.focus({ preventScroll: true });

    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [activeListTaskId, listDraftOpen, selectedProject?.hasKanbanBoard]);

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
    boardInteractionStateRef.current = {
      activeLaneId,
      activeTaskId,
      draftTaskLaneId,
      laneModalOpen,
      hasKanbanBoard: Boolean(selectedProject?.hasKanbanBoard),
      boardLanes,
    };
  }, [
    activeLaneId,
    activeTaskId,
    boardLanes,
    draftTaskLaneId,
    laneModalOpen,
    selectedProject?.hasKanbanBoard,
  ]);

  useEffect(() => {
    function handleBoardLift(event: Event) {
      const currentState = boardInteractionStateRef.current;

      if (
        !currentState.hasKanbanBoard ||
        currentState.laneModalOpen ||
        currentState.draftTaskLaneId
      ) {
        setLiftedTaskId("");
        return;
      }

      const detail =
        "detail" in event
          ? ((event as CustomEvent<{ active?: boolean }>).detail ?? undefined)
          : undefined;

      setLiftedTaskId(
        Boolean(detail?.active) && currentState.activeTaskId ? currentState.activeTaskId : "",
      );
    }

    function handleBoardMove(event: Event) {
      const currentState = boardInteractionStateRef.current;

      if (
        !currentState.hasKanbanBoard ||
        currentState.laneModalOpen ||
        currentState.draftTaskLaneId ||
        !currentState.activeTaskId
      ) {
        return;
      }

      const detail =
        "detail" in event
          ? ((event as CustomEvent<{ direction?: "left" | "right" }>).detail ?? undefined)
          : undefined;

      if (!detail?.direction || !currentState.activeLaneId) {
        return;
      }

      const activeLaneIndex = currentState.boardLanes.findIndex(
        (lane) => lane.id === currentState.activeLaneId,
      );

      if (activeLaneIndex < 0) {
        return;
      }

      const targetLaneIndex =
        detail.direction === "left" ? activeLaneIndex - 1 : activeLaneIndex + 1;

      if (targetLaneIndex < 0 || targetLaneIndex >= currentState.boardLanes.length) {
        return;
      }

      const targetLane = currentState.boardLanes[targetLaneIndex];
      setLiftedTaskId(currentState.activeTaskId);
      setPendingFocusedTaskId(currentState.activeTaskId);
      setActiveLaneId(targetLane.id);
      setActiveTaskId(currentState.activeTaskId);
      onUpdateTask(currentState.activeTaskId, { projectLaneId: targetLane.id });
    }

    window.addEventListener("lira:project-board-lift", handleBoardLift as EventListener);
    window.addEventListener("lira:move-project-board-task", handleBoardMove as EventListener);

    return () => {
      window.removeEventListener("lira:project-board-lift", handleBoardLift as EventListener);
      window.removeEventListener("lira:move-project-board-task", handleBoardMove as EventListener);
    };
  }, [
    onUpdateTask,
    setActiveLaneId,
    setActiveTaskId,
    setPendingFocusedTaskId,
  ]);

  useEffect(() => {
    function handleListKeyDown(event: KeyboardEvent) {
      if (
        !selectedProject ||
        selectedProject.hasKanbanBoard ||
        laneModalOpen ||
        pendingDeleteTask
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
        return;
      }

      if (listDraftOpen) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        setActiveListFilter("todo");
        setDeleteChordArmed(false);
        return;
      }

      if (event.key === "2") {
        event.preventDefault();
        setActiveListFilter("completed");
        setDeleteChordArmed(false);
        return;
      }

      if (event.key === "3") {
        event.preventDefault();
        setActiveListFilter("all");
        setDeleteChordArmed(false);
        return;
      }

      if (event.key === "Escape") {
        setDeleteChordArmed(false);
        return;
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

      if (event.key === "n") {
        event.preventDefault();
        setActiveListFilter("todo");
        setListDraftOpen(true);
        setListDraftTitle("");
        return;
      }

      if (event.key.toLowerCase() === "d") {
        if (!activeListTaskId) {
          return;
        }

        event.preventDefault();

        if (!deleteChordArmed) {
          setDeleteChordArmed(true);
          return;
        }

        const activeRow = projectListRows.find((row) => row.id === activeListTaskId);

        if (!activeRow) {
          setDeleteChordArmed(false);
          return;
        }

        setPendingDeleteTask({ id: activeRow.id, title: activeRow.title });
        setDeleteChordArmed(false);
        return;
      }

      if (event.key === "Enter") {
        if (!activeListTaskId) {
          return;
        }

        event.preventDefault();
        onSelectTask(activeListTaskId);
        return;
      }

      if ((event.key === "x" || event.key === "X") && activeListTaskId) {
        const activeTask = projectTasks.find((task) => task.id === activeListTaskId);

        if (!activeTask) {
          return;
        }

        event.preventDefault();
        onUpdateTask(activeListTaskId, { isCompleted: !activeTask.isCompleted });
        return;
      }

      const offset =
        projectTaskListMotionOffsets[event.key as keyof typeof projectTaskListMotionOffsets];

      if (!offset || !projectListRows.length) {
        return;
      }

      event.preventDefault();

      const currentIndex = projectListRows.findIndex((row) => row.id === activeListTaskId);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.max(0, Math.min(projectListRows.length - 1, startIndex + offset));
      setActiveListTaskId(projectListRows[nextIndex].id);
    }

    window.addEventListener("keydown", handleListKeyDown);

    return () => {
      window.removeEventListener("keydown", handleListKeyDown);
    };
  }, [
    activeListTaskId,
    deleteChordArmed,
    laneModalOpen,
    listDraftOpen,
    onSelectTask,
    pendingDeleteTask,
    onUpdateTask,
    projectListRows,
    projectTasks,
    selectedProject,
  ]);

  useEffect(() => {
    function handleProjectPageKeyDown(event: KeyboardEvent) {
      if (
        !selectedProject ||
        taskTemplateModalOpen ||
        laneModalOpen ||
        pendingDeleteTask ||
        listDraftOpen
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
        return;
      }

      if (event.shiftKey && event.key === "T") {
        event.preventDefault();
        openTaskTemplateModal();
      }
    }

    window.addEventListener("keydown", handleProjectPageKeyDown);

    return () => {
      window.removeEventListener("keydown", handleProjectPageKeyDown);
    };
  }, [laneModalOpen, listDraftOpen, pendingDeleteTask, selectedProject, taskTemplateModalOpen]);

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

  function openTaskTemplateModal() {
    const existingFields = selectedProject?.taskTemplate?.fields ?? [];
    const initialFields = existingFields.length ? existingFields : [createEmptyTaskTemplateField()];
    activeTaskTemplateControlRef.current = initialFields[0]
      ? {
          fieldId: initialFields[0].id,
          control: "label",
        }
      : null;
    setTaskTemplateDraftFields(initialFields);
    setPendingTaskTemplateFocusIndex(null);
    setTaskTemplateModalOpen(true);
  }

  function focusTaskTemplateFieldById(
    fieldId: string,
    control: "label" | "type",
    options?: { preserveIfAlreadyFocused?: boolean },
  ) {
    const rowIndex = taskTemplateDraftFields.findIndex((field) => field.id === fieldId);

    if (rowIndex < 0) {
      return;
    }

    const element =
      control === "label"
        ? templateFieldInputRefs.current.labels[rowIndex]
        : templateFieldInputRefs.current.types[rowIndex];

    if (!element) {
      return;
    }

    activeTaskTemplateControlRef.current = { fieldId, control };

    if (options?.preserveIfAlreadyFocused && document.activeElement === element) {
      return;
    }

    element.focus();
  }

  function focusTaskTemplateControl(
    rowIndex: number,
    control: "label" | "type" | "next-row",
  ) {
    const currentField = taskTemplateDraftFields[rowIndex];

    if (!currentField) {
      return;
    }

    if (control === "label") {
      focusTaskTemplateFieldById(currentField.id, "label");
      return;
    }

    if (control === "type") {
      focusTaskTemplateFieldById(currentField.id, "type");
      return;
    }

    const nextField = taskTemplateDraftFields[rowIndex + 1];

    if (nextField) {
      focusTaskTemplateFieldById(nextField.id, "label");
      return;
    }

    addTemplateFieldButtonRef.current?.focus();
  }

  function appendTaskTemplateField(options?: { focusNewField?: boolean }) {
    const nextField = createEmptyTaskTemplateField();
    const nextIndex = taskTemplateDraftFields.length;

    if (options?.focusNewField) {
      activeTaskTemplateControlRef.current = {
        fieldId: nextField.id,
        control: "label",
      };
      flushSync(() => {
        setTaskTemplateDraftFields((current) => [...current, nextField]);
      });
      templateFieldInputRefs.current.labels[nextIndex]?.focus();
      window.setTimeout(() => {
        templateFieldInputRefs.current.labels[nextIndex]?.focus();
      }, 0);
      return;
    }

    setTaskTemplateDraftFields((current) => [...current, nextField]);
  }

  function removeTaskTemplateField(fieldId: string, rowIndex: number) {
    setTaskTemplateDraftFields((current) => {
      const nextFields = current.filter((candidate) => candidate.id !== fieldId);

      window.setTimeout(() => {
        if (nextFields.length === 0) {
          activeTaskTemplateControlRef.current = null;
          addTemplateFieldButtonRef.current?.focus();
          return;
        }

        const nextIndex = Math.max(0, Math.min(rowIndex, nextFields.length - 1));
        activeTaskTemplateControlRef.current = {
          fieldId: nextFields[nextIndex].id,
          control: "label",
        };
        templateFieldInputRefs.current.labels[nextIndex]?.focus();
      }, 0);

      return nextFields;
    });
  }

  function handleTaskTemplateModalKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    control: "label" | "type",
    fieldId: string,
  ) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSaveTaskTemplate();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === "n") {
      event.preventDefault();
      const nextIndex = taskTemplateDraftFields.length;
      flushSync(() => {
        appendTaskTemplateField();
      });
      templateFieldInputRefs.current.labels[nextIndex]?.focus();
      return;
    }

    if (event.altKey && event.key === "Backspace") {
      event.preventDefault();
      removeTaskTemplateField(fieldId, rowIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setTaskTemplateModalOpen(false);
      setTaskTemplateDraftFields([]);
      return;
    }

    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (control === "label") {
      focusTaskTemplateControl(rowIndex, "type");
      return;
    }

    focusTaskTemplateControl(rowIndex, "next-row");
  }

  function handleSaveTaskTemplate() {
    if (!selectedProject) {
      return;
    }

    const normalizedFields = taskTemplateDraftFields
      .map((field) => {
        const label = field.label.trim();
        const nextKey = normalizeTaskTemplateKey(label);

        if (!label || !nextKey) {
          return null;
        }

        return {
          ...field,
          label,
          key: nextKey,
          type: field.type,
        };
      })
      .filter((field): field is ProjectTaskTemplateField => field !== null);

    onUpdateProject(selectedProject.id, {
      taskTemplate: normalizedFields.length
        ? {
            fields: normalizedFields,
            updatedAt: new Date().toISOString(),
          }
        : undefined,
    });

    setTaskTemplateModalOpen(false);
    setTaskTemplateDraftFields([]);
    setPendingTaskTemplateFocusIndex(null);
  }

  function updateTaskTemplateFieldLabel(fieldId: string, nextLabel: string) {
    setTaskTemplateDraftFields((current) =>
      current.map((candidate) => {
        if (candidate.id !== fieldId) {
          return candidate;
        }

        return {
          ...candidate,
          label: nextLabel,
          key: normalizeTaskTemplateKey(nextLabel),
        };
      }),
    );
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

  function handleSubmitListTask() {
    const trimmedTitle = listDraftTitle.trim();

    if (!trimmedTitle || !selectedProject) {
      return;
    }

    onCreateTask({
      title: trimmedTitle,
      description: "",
      goalId: "",
      projectId: selectedProject.id,
      openDetailOnSuccess: false,
    });
    setListDraftTitle("");
    setListDraftOpen(false);
  }

  const taskTemplateModal = taskTemplateModalOpen ? (
    <Modal
      ariaLabelledBy="project-task-template-title"
      className="confirm-panel project-task-template-panel"
      onClose={() => {
        setTaskTemplateModalOpen(false);
        setTaskTemplateDraftFields([]);
        setPendingTaskTemplateFocusIndex(null);
      }}
    >
      <div className="confirm-panel__content project-task-template-modal">
        <p id="project-task-template-title" className="confirm-panel__title">
          Task template
        </p>
        <p className="confirm-panel__copy">
          Add project-specific fields for tasks in this project.
        </p>
        <p className="project-task-template-modal__hint">
          Key is generated from the label by default.
        </p>
        <div className="project-task-template-modal__fields">
          <div className="project-task-template-modal__field-headings" aria-hidden="true">
            <span>Label</span>
            <span>Type</span>
            <span>Action</span>
          </div>
          {taskTemplateDraftFields.map((field, index) => (
            <div key={field.id} className="project-task-template-modal__field-row">
              <input
                className="ui-input"
                aria-label={`Field label ${index + 1}`}
                placeholder="Task ID"
                ref={(element) => {
                  templateFieldInputRefs.current.labels[index] = element;
                }}
                onFocus={() => {
                  activeTaskTemplateControlRef.current = { fieldId: field.id, control: "label" };
                }}
                value={field.label}
                onChange={(event) => updateTaskTemplateFieldLabel(field.id, event.target.value)}
                onKeyDown={(event) =>
                  handleTaskTemplateModalKeyDown(event, index, "label", field.id)
                }
              />
              <select
                className="ui-select"
                aria-label={`Field type ${index + 1}`}
                ref={(element) => {
                  templateFieldInputRefs.current.types[index] = element;
                }}
                onFocus={() => {
                  activeTaskTemplateControlRef.current = { fieldId: field.id, control: "type" };
                }}
                value={field.type}
                onChange={(event) =>
                  setTaskTemplateDraftFields((current) =>
                    current.map((candidate) =>
                      candidate.id === field.id
                        ? {
                            ...candidate,
                            type: event.target.value as ProjectTaskTemplateFieldType,
                          }
                        : candidate,
                    ),
                  )
                }
                onKeyDown={(event) =>
                  handleTaskTemplateModalKeyDown(event, index, "type", field.id)
                }
              >
                {taskTemplateFieldTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="project-task-template-modal__remove"
                onClick={() => removeTaskTemplateField(field.id, index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <ActionBar className="project-task-template-modal__actions">
              <button
                type="button"
                ref={addTemplateFieldButtonRef}
                className="projects-board-header__button"
                onClick={() => appendTaskTemplateField({ focusNewField: true })}
              >
                Add field
              </button>
              <button
                type="button"
                ref={saveTemplateButtonRef}
                className="confirm-panel__button"
                onClick={handleSaveTaskTemplate}
              >
                Save template
              </button>
        </ActionBar>
      </div>
    </Modal>
  ) : null;

  if (!selectedProject.hasKanbanBoard) {
    return (
      <PageShell ariaLabel="Projects" className="page--projects-list">
        <ThreeColumnLayout
          className="projects-layout"
          leftCollapsed
          rightCollapsed={!showRightRail}
          leftLabel="Projects navigation"
          centerLabel="Projects"
          rightLabel="Project insights"
          left={null}
          center={
            <div className="projects-board-main">
              <header className="projects-board-header">
                <div>
                  <p className="page__eyebrow">Project tasks</p>
                  <h1 className="projects-board-header__title">{selectedProject.name}</h1>
                  <p className="projects-board-header__copy">
                    {selectedProject.description || "No description yet."}
                  </p>
                  <ActionBar className="projects-board-header__project-actions">
                    <button
                      type="button"
                      className="projects-board-header__button"
                      onClick={openTaskTemplateModal}
                    >
                      <EditIcon className="projects-board-header__icon" />
                      <span>
                        {selectedProject.taskTemplate?.fields.length
                          ? "Edit task template"
                          : "Create task template"}
                      </span>
                    </button>
                  </ActionBar>
                  <div className="inbox-filters project-task-filters" aria-label="Project task filters">
                    {projectListFilterDefinitions.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`inbox-filter ${activeListFilter === filter.id ? "inbox-filter--active is-active" : ""}`}
                        onClick={() => setActiveListFilter(filter.id)}
                      >
                        <span>{filter.label}</span>
                        <span className="inbox-filter__count" aria-hidden="true">
                          {projectListCounts[filter.id]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </header>

              <div className="project-task-list-wrap">
                <table
                  ref={listTableRef}
                  className="project-task-list"
                  aria-label="Project tasks"
                  tabIndex={0}
                >
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col">Created</th>
                      <th scope="col">Due</th>
                      <th scope="col">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listDraftOpen ? (
                      <tr className="project-task-list__draft-row">
                        <td colSpan={4}>
                          <form
                            className="project-task-list__draft-form"
                            onSubmit={(event) => {
                              event.preventDefault();
                              handleSubmitListTask();
                            }}
                          >
                            <input
                              className="project-task-list__draft-input"
                              aria-label="New task title"
                              placeholder="New task"
                              value={listDraftTitle}
                              autoFocus
                              onChange={(event) => setListDraftTitle(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleSubmitListTask();
                                  return;
                                }

                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setListDraftTitle("");
                                  setListDraftOpen(false);
                                }
                              }}
                            />
                          </form>
                        </td>
                      </tr>
                    ) : null}
                    {projectListRows.map((row) => (
                      <tr
                        key={row.id}
                        ref={(element) => {
                          if (element) {
                            rowRefs.current.set(row.id, element);
                          } else {
                            rowRefs.current.delete(row.id);
                          }
                        }}
                        aria-label={row.title}
                        className={activeListTaskId === row.id ? "is-active" : ""}
                        aria-selected={activeListTaskId === row.id}
                        onMouseDown={() => setActiveListTaskId(row.id)}
                      >
                        <td className="project-task-list__title-cell">
                          <div className="project-task-list__title-wrap">
                            <button
                              type="button"
                              className={`project-task-list__checkbox ${row.isCompleted ? "is-checked" : ""}`}
                              role="checkbox"
                              aria-checked={row.isCompleted}
                              aria-label={`Complete ${row.title}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setActiveListTaskId(row.id);
                                onUpdateTask(row.id, { isCompleted: !row.isCompleted });
                              }}
                            >
                              <span className="project-task-list__checkbox-mark" />
                            </button>
                            <button
                              type="button"
                              className="project-task-list__row-button"
                              onClick={() => {
                                setActiveListTaskId(row.id);
                                onSelectTask(row.id);
                              }}
                            >
                              {row.title}
                            </button>
                          </div>
                        </td>
                        <td>{row.createdAt}</td>
                        <td>{row.due}</td>
                        <td>{row.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          }
          right={
            <RightRailColumn
              items={items}
              todayDate={todayDate}
            />
          }
        />
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
        {taskTemplateModal}
      </PageShell>
    );
  }

  return (
    <PageShell ariaLabel="Projects" className="page--projects-board">
      <ThreeColumnLayout
        className="projects-layout"
        leftCollapsed
        rightCollapsed={!showRightRail}
        leftLabel="Projects navigation"
        centerLabel="Projects"
        rightLabel="Project insights"
        left={null}
        center={
          <div className="projects-board-main">
            <header className="projects-board-header">
              <div>
                <p className="page__eyebrow">Project board</p>
                <h1 className="projects-board-header__title">{selectedProject.name}</h1>
                <p className="projects-board-header__copy">
                  {selectedProject.description || "No description yet."}
                </p>
                <ActionBar className="projects-board-header__project-actions">
                  <button
                    type="button"
                    className="projects-board-header__button"
                    onClick={openTaskTemplateModal}
                  >
                    <EditIcon className="projects-board-header__icon" />
                    <span>
                      {selectedProject.taskTemplate?.fields.length
                        ? "Edit task template"
                        : "Create task template"}
                    </span>
                  </button>
                  {/* <button
                    type="button"
                    className="projects-board-header__button"
                    onClick={() => setLaneModalOpen(true)}
                  >
                    Add lane
                  </button> */}
                </ActionBar>
              </div>
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
                    <span
                      className={`projects-board-lane__count ${
                        activeLaneId === lane.id ? "is-active" : ""
                      }`.trim()}
                    >
                      {laneGroups.get(lane.id)?.length ?? 0}
                    </span>
                  </header>

                  <div className="projects-board-lane__cards">
                    {draftTaskLaneId === lane.id ? (
                      <form
                        className="projects-board-card projects-board-card--draft is-focused"
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
                          activeLaneId === lane.id && activeTaskId === task.id && !draftTaskLaneId ? "is-focused" : ""
                        } ${
                          liftedTaskId === task.id ? "is-lifted" : ""
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
        }
        right={
          <RightRailColumn
            items={items}
            todayDate={todayDate}
          />
        }
      />

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
      {taskTemplateModal}
    </PageShell>
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
    <Modal ariaLabelledBy="project-task-delete-confirm-title" className="inbox-confirm" onClose={onClose}>
      <div className="inbox-confirm__content">
        <p id="project-task-delete-confirm-title" className="new-task__title">
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

function formatTaskTimestampLabel(task: Item) {
  const timestampPrefix = task.updatedAt !== task.createdAt ? "UPDATED" : "CREATED";
  const timestampValue = formatRelativeTimestamp(
    task.updatedAt !== task.createdAt ? task.updatedAt : task.createdAt,
  );

  return `${timestampPrefix} ${timestampValue.toUpperCase()}`;
}
