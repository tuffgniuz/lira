import { useCallback, useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { CommandPalette } from "@/components/navigation/command-palette";
import type { CommandPaletteItem } from "@/components/navigation/command-palette";
import {
  ArrowTurnIcon,
  CollapseSidebarIcon,
  LayersIcon,
  NoteIcon,
  SettingsIcon,
  SparkIcon,
  InfoIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/icons";
import type { ViewId } from "@/app/navigation/types";
import {
  readStoredVaultPath,
  navigationItems,
  vaultPathStorageKey,
} from "@/app/navigation/navigation";
import {
  leaderKey, listGoalsSequence, listInboxItemsSequence, listProjectsSequence,
  listTasksSequence, listDocsSequence, listProjectDocsSequence, mappedSequences, newDocSequence,
  newGoalSequence, newInboxItemSequence, newProjectSequence, newTaskSequence,
  rightRailAutoSequence, rightRailCycleSequence, rightRailHiddenSequence, rightRailPinnedSequence,
  normalizeMappedKey, pageSequence, sequenceStartsWith,
} from "@/app/navigation/keymappings";

import type { Doc } from "@/models/doc";
import { loadProfile, saveProfile } from "@/services/profile";
import { loadProjects, saveProjects } from "@/services/projects";
import {
  createDoc as persistCreateDoc,
  deleteDoc as persistDeleteDoc,
  loadDocs,
  updateDoc as persistUpdateDoc,
} from "@/services/docs";
import { updateTask as persistTaskUpdate, type PersistedTask } from "@/services/tasks";
import { loadWorkspaceItems, replaceWorkspaceItems } from "@/services/workspace";
import { initializeVault } from "@/services/vault";
import {
  getInitialVaultPath,
  shouldAutoInitializeDevelopmentVault,
} from "./vault-path";
import {
  attachProjectIdsFromNames,
  getProjectName,
} from "@/lib/domain/project-relations";
import type { Item } from "@/models/workspace-item";
import type { Project } from "@/models/project";
import { defaultProjectBoardLanes } from "@/models/project-board";
import type { UserProfile } from "@/models/profile";
import { NewGoalModal } from "@/components/actions/new-goal-modal";
import { NewProjectModal } from "@/components/actions/new-project-modal";
import { useTheme } from "@/theme/theme-provider";
import {
  formatThemeColorName,
  formatThemeColorToken,
  type ThemeColorToken,
} from "@/theme/theme-types";
import { QuickCaptureModal } from "@/components/actions/quick-capture-modal";
import { SettingsModal } from "@/components/actions/settings-modal";
import { NewDocModal } from "@/components/actions/new-doc-modal/new-doc-modal";
import { NewTaskModal } from "@/components/actions/new-task-modal";
import { PageContent } from "./page-content";
import type { RightRailMode } from "./page-content";

const defaultProfile: UserProfile = {
  name: "User",
  profilePicture: "",
};
const rightRailModeStorageKey = "lira.right-rail-mode";
const rightRailModes: RightRailMode[] = ["auto", "pinned", "hidden"];

function isRightRailMode(value: string | null): value is RightRailMode {
  return value === "auto" || value === "pinned" || value === "hidden";
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPersistenceError(context: string, error: unknown) {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  return `Failed to ${context}: ${detail}`;
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function dispatchProjectBoardMove(direction: "left" | "right") {
  window.dispatchEvent(
    new CustomEvent("lira:move-project-board-task", {
      detail: { direction },
    }),
  );
}

function dispatchProjectBoardLift(active: boolean) {
  window.dispatchEvent(
    new CustomEvent("lira:project-board-lift", {
      detail: { active },
    }),
  );
}

function taskPayloadFromWorkspaceItem(item: Item): PersistedTask {
  return {
    id: item.id,
    title: item.title,
    description: item.content.trim() ? item.content : null,
    lifecycleStatus:
      item.state === "archived" ? "archived" : item.state === "deleted" ? "deleted" : "active",
    isCompleted: item.isCompleted,
    scheduleBucket: item.scheduleBucket ?? (item.dueDate ? "today" : "none"),
    priority:
      item.priority === "low"
        ? 1
        : item.priority === "medium"
          ? 2
          : item.priority === "high"
            ? 3
            : item.priority === "urgent"
              ? 4
              : null,
    dueAt: item.dueDate || null,
    completedAt: item.completedAt || null,
    estimateMinutes: item.estimate ? Number.parseInt(item.estimate, 10) || null : null,
    projectId: item.projectId ?? null,
    projectLaneId: item.projectLaneId ?? null,
    sourceCaptureId: item.sourceCaptureId ?? null,
    customFieldValues: item.customFieldValues ?? {},
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getInitialTaskCustomFieldValues(projects: Project[], projectId?: string) {
  if (!projectId) {
    return {};
  }

  const taskTemplateFields =
    projects.find((project) => project.id === projectId)?.taskTemplate?.fields ?? [];

  return Object.fromEntries(taskTemplateFields.map((field) => [field.key, ""]));
}

function getInitialTaskDescription(
  projects: Project[],
  projectId: string | undefined,
  description: string,
) {
  if (description.trim()) {
    return description;
  }

  if (!projectId) {
    return description;
  }

  return projects.find((project) => project.id === projectId)?.taskTemplate?.descriptionTemplate ?? "";
}

function getDefaultProjectLaneId(projects: Project[], projectId?: string) {
  if (!projectId) {
    return undefined;
  }

  const project = projects.find((candidate) => candidate.id === projectId);

  if (project && !project.hasKanbanBoard) {
    return undefined;
  }

  const laneFromProject = project?.boardLanes[0]?.id;

  if (laneFromProject) {
    return laneFromProject;
  }

  return defaultProjectBoardLanes(projectId)[0]?.id;
}

function pruneGoalScopeTaskId(goalScope: Item["goalScope"], taskId: string) {
  if (!goalScope?.taskIds?.includes(taskId)) {
    return goalScope;
  }

  const nextTaskIds = goalScope.taskIds.filter((candidateId) => candidateId !== taskId);

  if (!goalScope.projectId && !goalScope.tag && nextTaskIds.length === 0) {
    return undefined;
  }

  return {
    ...goalScope,
    taskIds: nextTaskIds,
  };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest('[data-vim-mode="normal"]')) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable ||
    target.contentEditable === "true" ||
    target.getAttribute("contenteditable") === "true" ||
    target.closest("[contenteditable]") !== null
  );
}

type ListPaletteKind = "projects" | "tasks" | "goals" | "inbox" | "docs" | "project-docs";
type NavigationLocation = {
  view: ViewId;
  selectedProjectId: string;
  selectedGoalId: string;
  selectedTaskId: string;
  selectedDocId: string;
};

function locationsMatch(left: NavigationLocation, right: NavigationLocation) {
  return (
    left.view === right.view &&
    left.selectedProjectId === right.selectedProjectId &&
    left.selectedGoalId === right.selectedGoalId &&
    left.selectedTaskId === right.selectedTaskId &&
    left.selectedDocId === right.selectedDocId
  );
}

export function LiraShell() {
  const {
    activeThemeId,
    activeAccentToken,
    themes,
    previewTheme,
    applyThemeSelection,
    resetPreview,
  } = useTheme();
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"theme" | "profile" | "vault">(
    "theme",
  );
  const [pendingThemeId, setPendingThemeId] = useState(activeThemeId);
  const [pendingAccentToken, setPendingAccentToken] =
    useState<ThemeColorToken>(activeAccentToken);
  const [vaultPath, setVaultPath] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return getInitialVaultPath(
      readStoredVaultPath(window.localStorage),
      import.meta.env.DEV,
    );
  });
  const [pendingVaultPath, setPendingVaultPath] = useState(vaultPath);
  const [vaultError, setVaultError] = useState("");
  const [loadedItemVaultPath, setLoadedItemVaultPath] = useState("");
  const [loadedDocVaultPath, setLoadedDocVaultPath] = useState("");
  const [loadedProjectVaultPath, setLoadedProjectVaultPath] = useState("");
  const [, setLoadedProfileVaultPath] = useState("");
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [pendingProfileName, setPendingProfileName] = useState(defaultProfile.name);
  const [pendingProfilePicture, setPendingProfilePicture] = useState(
    defaultProfile.profilePicture,
  );
  const todayDate = getTodayDateString();
  const [items, setItems] = useState<Item[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [taskDraftResetKeys, setTaskDraftResetKeys] = useState<Record<string, number>>({});
  const [docDraftResetKeys, setDocDraftResetKeys] = useState<Record<string, number>>({});
  const [toastNotification, setToastNotification] = useState<{
    message: string;
    type: "inform" | "success" | "warning";
  } | null>(null);
  const [rightRailMode, setRightRailMode] = useState<RightRailMode>(() => {
    if (typeof window === "undefined") {
      return "auto";
    }

    const storedMode = window.localStorage.getItem(rightRailModeStorageKey);

    return isRightRailMode(storedMode) ? storedMode : "auto";
  });

  const setToastMessage = useCallback(
    (message: string, type: "inform" | "success" | "warning" = "inform") => {
      if (!message) {
        setToastNotification(null);
      } else {
        setToastNotification({ message, type });
      }
    },
    [],
  );

  const applyRightRailMode = useCallback(
    (mode: RightRailMode) => {
      setRightRailMode(mode);

      const modeLabel =
        mode === "auto" ? "auto" : mode === "pinned" ? "pinned open" : "hidden";
      setToastMessage(`Right rail ${modeLabel}`);
    },
    [setToastMessage],
  );

  const cycleRightRailMode = useCallback(() => {
    const currentIndex = rightRailModes.indexOf(rightRailMode);
    const nextMode = rightRailModes[(currentIndex + 1) % rightRailModes.length] ?? "auto";
    applyRightRailMode(nextMode);
  }, [applyRightRailMode, rightRailMode]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [listPaletteKind, setListPaletteKind] = useState<ListPaletteKind | null>(null);
  const [commandLauncherOpen, setCommandLauncherOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState("");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const keySequenceRef = useRef<string[]>([]);
  const keySequenceTimeoutRef = useRef<number | null>(null);
  const itemMutationVersionRef = useRef(0);
  const docMutationVersionRef = useRef(0);
  const projectMutationVersionRef = useRef(0);
  const taskSaveRequestVersionRef = useRef(new Map<string, number>());
  const docSaveRequestVersionRef = useRef(new Map<string, number>());
  const mainPanelContentRef = useRef<HTMLDivElement | null>(null);
  const lastMainPanelFocusRef = useRef<HTMLElement | null>(null);
  const pageHistoryRef = useRef<NavigationLocation[]>([
    {
      view: "dashboard",
      selectedProjectId: "",
      selectedGoalId: "",
      selectedTaskId: "",
      selectedDocId: "",
    },
  ]);
  const pageHistoryIndexRef = useRef(0);

  const pageItems: CommandPaletteItem[] = [
    {
      id: "dashboard",
      label: "Home",
      keywords: ["home", "dashboard", "start"],
      icon: <SparkIcon className="nav-icon" />,
    },
    ...navigationItems.map((item) => ({
      id: item.id,
      label: item.label,
      keywords: [item.id.replace("_", " "), item.label.toLowerCase()],
      icon: <item.icon className="nav-icon" />,
    })),
  ];
  const projectItems: CommandPaletteItem[] = projects.map((project) => ({
    id: project.id,
    label: project.name,
    keywords: [project.description.toLowerCase(), "project"],
    icon: <LayersIcon className="nav-icon" />,
  }));
  const taskItems: CommandPaletteItem[] = items
    .filter((item) => item.kind === "task" && item.state !== "deleted")
    .map((item) => ({
      id: item.id,
      label: item.title,
      keywords: [item.content.toLowerCase(), item.project.toLowerCase(), "task"],
      icon: <SparkIcon className="nav-icon" />,
    }));
  const goalItems: CommandPaletteItem[] = items
    .filter((item) => item.kind === "goal" && item.state !== "deleted")
    .map((item) => ({
      id: item.id,
      label: item.title,
      keywords: [item.content.toLowerCase(), item.goalMetric?.replace(/_/g, " ") ?? "direct", "goal"],
      icon: <SparkIcon className="nav-icon" />,
    }));
  const inboxItems: CommandPaletteItem[] = items
    .filter(
      (item) => item.kind === "capture" && item.sourceType === "capture" && item.state !== "deleted",
    )
    .map((item) => ({
      id: item.id,
      label: item.content || item.title,
      keywords: [item.title.toLowerCase(), item.state, "inbox", "capture"],
      icon: <SparkIcon className="nav-icon" />,
    }));
  const docItems: CommandPaletteItem[] = docs.map((doc) => ({
    id: doc.id,
    label: doc.title,
    meta: getProjectName(projects, doc.projectId, "") || "Standalone",
    keywords: [
      doc.body.toLowerCase(),
      getProjectName(projects, doc.projectId, "").toLowerCase(),
      "doc",
      "document",
    ],
    icon: <NoteIcon className="nav-icon" />,
  }));
  const projectDocItems: CommandPaletteItem[] = docs
    .filter((doc) => doc.projectId === selectedProjectId)
    .map((doc) => ({
      id: doc.id,
      label: doc.title,
      meta: getProjectName(projects, doc.projectId, "") || "Standalone",
      keywords: [
        doc.body.toLowerCase(),
        "doc",
        "document",
      ],
      icon: <NoteIcon className="nav-icon" />,
    }));
  const pendingTheme = themes.find((theme) => theme.id === pendingThemeId) ?? themes[0];
  const accentOptions = Object.entries(pendingTheme.colors).map(([token, color]) => ({
    id: token as ThemeColorToken,
    label: formatThemeColorName(color),
    tokenLabel: formatThemeColorToken(token as ThemeColorToken),
    color,
  }));

  const listPaletteConfig =
    listPaletteKind === "projects"
      ? {
          title: "Projects",
          placeholder: "list projects",
          emptyMessage: "No projects match that query.",
          items: projectItems,
        }
      : listPaletteKind === "tasks"
        ? {
            title: "Tasks",
            placeholder: "list tasks",
            emptyMessage: "No tasks match that query.",
            items: taskItems,
          }
        : listPaletteKind === "goals"
          ? {
              title: "Goals",
              placeholder: "list goals",
              emptyMessage: "No goals match that query.",
              items: goalItems,
            }
            : listPaletteKind === "inbox"
            ? {
                title: "Inbox",
                placeholder: "list inbox items",
                emptyMessage: "No inbox items match that query.",
                items: inboxItems,
              }
            : listPaletteKind === "docs"
              ? {
                  title: "Docs",
                  placeholder: "list docs",
                  emptyMessage: "No docs match that query.",
                  items: docItems,
                }
              : listPaletteKind === "project-docs"
                ? {
                    title: "Project Docs",
                    placeholder: "list project docs",
                    emptyMessage: "No docs match that query.",
                    items: projectDocItems,
                  }
              : null;

  const commandItems: CommandPaletteItem[] = [
    {
      id: "go-to-page",
      label: "Go to page",
      keywords: ["gtp", "navigate", "page"],
      icon: <ArrowTurnIcon className="nav-icon" />,
    },
    {
      id: "new-inbox-item",
      label: "New inbox item",
      keywords: ["ni", "new", "capture", "inbox"],
      icon: <SparkIcon className="nav-icon" />,
    },
    {
      id: "new-goal",
      label: "New goal",
      keywords: ["ng", "new", "goal"],
      icon: <SparkIcon className="nav-icon" />,
    },
    {
      id: "new-task",
      label: "New task",
      keywords: ["nt", "new", "task"],
      icon: <SparkIcon className="nav-icon" />,
    },
    {
      id: "new-doc",
      label: "New doc",
      keywords: ["nd", "new", "doc", "document"],
      icon: <NoteIcon className="nav-icon" />,
    },
    {
      id: "new-project",
      label: "New project",
      keywords: ["np", "new", "project"],
      icon: <SparkIcon className="nav-icon" />,
    },
    {
      id: "settings",
      label: "Settings",
      keywords: ["preferences", "theme", "config"],
      icon: <SettingsIcon className="nav-icon" />,
    },
    {
      id: "right-rail-cycle",
      label: "Right rail cycle mode",
      keywords: ["right rail", "rail", "panel", "cycle", "toggle"],
      icon: <CollapseSidebarIcon className="nav-icon" />,
    },
    {
      id: "right-rail-pin",
      label: "Right rail pin",
      keywords: ["right rail", "rail", "panel", "pin", "show"],
      icon: <CollapseSidebarIcon className="nav-icon" />,
    },
    {
      id: "right-rail-hide",
      label: "Right rail hide",
      keywords: ["right rail", "rail", "panel", "hide"],
      icon: <CollapseSidebarIcon className="nav-icon" />,
    },
    {
      id: "right-rail-auto",
      label: "Right rail auto",
      keywords: ["right rail", "rail", "panel", "auto", "responsive"],
      icon: <CollapseSidebarIcon className="nav-icon" />,
    },
  ];

  async function mutateItems(
    updater: (current: Item[]) => Item[],
    options?: {
      successMessage?: string;
      onSuccess?: (nextItems: Item[]) => void;
      onFailure?: () => void;
    },
  ) {
    if (!vaultPath || loadedItemVaultPath !== vaultPath) {
      setToastMessage("Failed to save workspace changes: vault is not ready", "warning");
      options?.onFailure?.();
      return false;
    }

    const nextItems = updater(items);

    if (nextItems === items) {
      return false;
    }

    try {
      await replaceWorkspaceItems(vaultPath, nextItems);
      itemMutationVersionRef.current += 1;
      setItems(nextItems);

      if (options?.successMessage) {
        setToastMessage(options.successMessage);
      }

      options?.onSuccess?.(nextItems);
      return true;
    } catch (error) {
      setToastMessage(formatPersistenceError("save workspace changes", error), "warning");
      options?.onFailure?.();
      return false;
    }
  }

  async function mutateProjects(
    updater: (current: Project[]) => Project[],
    options?: {
      successMessage?: string;
      onSuccess?: (nextProjects: Project[]) => void;
      onFailure?: () => void;
    },
  ) {
    if (!vaultPath || loadedProjectVaultPath !== vaultPath) {
      setToastMessage("Failed to save projects: vault is not ready", "warning");
      options?.onFailure?.();
      return false;
    }

    const nextProjects = updater(projects);

    if (nextProjects === projects) {
      return false;
    }

    try {
      await saveProjects(vaultPath, nextProjects);
      projectMutationVersionRef.current += 1;
      setProjects(nextProjects);

      if (options?.successMessage) {
        setToastMessage(options.successMessage);
      }

      options?.onSuccess?.(nextProjects);
      return true;
    } catch (error) {
      setToastMessage(formatPersistenceError("save projects", error), "warning");
      options?.onFailure?.();
      return false;
    }
  }

  function clearKeySequence() {
    keySequenceRef.current = [];

    if (keySequenceTimeoutRef.current) {
      window.clearTimeout(keySequenceTimeoutRef.current);
      keySequenceTimeoutRef.current = null;
    }
  }

  function rememberMainPanelFocus() {
    if (typeof document === "undefined") {
      return;
    }

    const activeElement = document.activeElement;
    const mainPanelContent = mainPanelContentRef.current;

    if (!(activeElement instanceof HTMLElement) || !mainPanelContent?.contains(activeElement)) {
      return;
    }

    lastMainPanelFocusRef.current = activeElement;
  }

  function restoreMainPanelFocus() {
    if (typeof window === "undefined") {
      return;
    }

    const focusTarget = lastMainPanelFocusRef.current;

    if (!focusTarget?.isConnected) {
      lastMainPanelFocusRef.current = null;
      return;
    }

    window.requestAnimationFrame(() => {
      if (!focusTarget.isConnected) {
        lastMainPanelFocusRef.current = null;
        return;
      }

      focusTarget.focus();
    });
  }

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId("");
      return;
    }

    const hasSelectedProject = projects.some((project) => project.id === selectedProjectId);

    if (!hasSelectedProject) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!toastNotification) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastNotification(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastNotification]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(rightRailModeStorageKey, rightRailMode);
  }, [rightRailMode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const typingTarget = isTypingTarget(event.target);

      if (event.key === "Escape" && settingsOpen) {
        event.preventDefault();
        closeSettings();
        return;
      }

      if (event.key === "Escape" && commandPaletteOpen) {
        event.preventDefault();
        closeCommandPalette();
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && commandLauncherOpen) {
        event.preventDefault();
        closeCommandLauncher();
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && listPaletteKind) {
        event.preventDefault();
        closeListPalette();
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && quickCaptureOpen) {
        event.preventDefault();
        closeQuickCapture();
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && newGoalOpen) {
        event.preventDefault();
        closeNewGoal();
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && newTaskOpen) {
        event.preventDefault();
        closeNewTask();
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && newDocOpen) {
        event.preventDefault();
        closeNewDoc();
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && newProjectOpen) {
        event.preventDefault();
        closeNewProject();
        clearKeySequence();
        return;
      }

      if (
        event.key === "Escape" &&
        activeView === "goals" &&
        selectedGoalId &&
        !typingTarget
      ) {
        event.preventDefault();
        setSelectedGoalId("");
        clearKeySequence();
        return;
      }

      if (
        commandPaletteOpen ||
        listPaletteKind !== null ||
        commandLauncherOpen ||
        quickCaptureOpen ||
        newGoalOpen ||
        newTaskOpen ||
        newDocOpen ||
        newProjectOpen ||
        settingsOpen ||
        typingTarget
      ) {
        return;
      }

      if (
        activeView === "projects" &&
        !selectedTaskId &&
        keySequenceRef.current.length === 1 &&
        keySequenceRef.current[0] === leaderKey &&
        event.key === "Shift"
      ) {
        dispatchProjectBoardLift(true);
      }

      if (
        !keySequenceRef.current.length &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const loweredKey = event.key.toLowerCase();

        if (loweredKey === "o") {
          event.preventDefault();
          navigatePageHistory(-1);
          clearKeySequence();
          return;
        }

        if (loweredKey === "i") {
          event.preventDefault();
          navigatePageHistory(1);
          clearKeySequence();
          return;
        }
      }

      if (event.key === ":") {
        event.preventDefault();
        openCommandLauncher();
        clearKeySequence();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        clearKeySequence();
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const normalizedKey = normalizeMappedKey(event.key);

      if (!keySequenceRef.current.length && normalizedKey !== leaderKey) {
        return;
      }

      if (normalizedKey === leaderKey || keySequenceRef.current.length) {
        event.preventDefault();
        event.stopPropagation();
      }

      const nextSequence = [...keySequenceRef.current, normalizedKey].slice(-4);
      keySequenceRef.current = nextSequence;

      if (keySequenceTimeoutRef.current) {
        window.clearTimeout(keySequenceTimeoutRef.current);
      }

      keySequenceTimeoutRef.current = window.setTimeout(() => {
        clearKeySequence();
      }, 1200);

      if (nextSequence.join("") === pageSequence.join("")) {
        event.preventDefault();
        openCommandPalette();
        clearKeySequence();
        return;
      }

      if (
        activeView === "projects" &&
        !selectedTaskId &&
        nextSequence.length === 2 &&
        nextSequence[0] === leaderKey &&
        nextSequence[1] === "h" &&
        event.shiftKey &&
        event.key === "H"
      ) {
        event.preventDefault();
        dispatchProjectBoardMove("left");
        clearKeySequence();
        return;
      }

      if (
        activeView === "projects" &&
        !selectedTaskId &&
        nextSequence.length === 2 &&
        nextSequence[0] === leaderKey &&
        nextSequence[1] === "l" &&
        event.shiftKey &&
        event.key === "L"
      ) {
        event.preventDefault();
        dispatchProjectBoardMove("right");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === listProjectsSequence.join("")) {
        event.preventDefault();
        openListPalette("projects");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === listTasksSequence.join("")) {
        event.preventDefault();
        openListPalette("tasks");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === listGoalsSequence.join("")) {
        event.preventDefault();
        openListPalette("goals");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === listInboxItemsSequence.join("")) {
        event.preventDefault();
        openListPalette("inbox");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === listDocsSequence.join("")) {
        event.preventDefault();
        openListPalette("docs");
        clearKeySequence();
        return;
      }

      if (
        activeView === "projects" &&
        selectedProjectId &&
        nextSequence.join("") === listProjectDocsSequence.join("")
      ) {
        event.preventDefault();
        openListPalette("project-docs");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newInboxItemSequence.join("")) {
        event.preventDefault();
        openQuickCapture();
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newGoalSequence.join("")) {
        event.preventDefault();
        openNewGoal();
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newTaskSequence.join("")) {
        event.preventDefault();
        openNewTask();
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newDocSequence.join("")) {
        event.preventDefault();
        openNewDoc();
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newProjectSequence.join("")) {
        event.preventDefault();
        openNewProject();
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === rightRailCycleSequence.join("")) {
        event.preventDefault();
        cycleRightRailMode();
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === rightRailPinnedSequence.join("")) {
        event.preventDefault();
        applyRightRailMode("pinned");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === rightRailHiddenSequence.join("")) {
        event.preventDefault();
        applyRightRailMode("hidden");
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === rightRailAutoSequence.join("")) {
        event.preventDefault();
        applyRightRailMode("auto");
        clearKeySequence();
        return;
      }

      const isKnownPrefix = mappedSequences.some((sequence) =>
        sequenceStartsWith(sequence, nextSequence),
      );

      if (!isKnownPrefix) {
        clearKeySequence();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    activeView,
    commandLauncherOpen,
    commandPaletteOpen,
    listPaletteKind,
    newGoalOpen,
    newDocOpen,
    newProjectOpen,
    newTaskOpen,
    projects.length,
    quickCaptureOpen,
    rightRailMode,
    selectedGoalId,
    selectedTaskId,
    settingsOpen,
    applyRightRailMode,
    cycleRightRailMode,
  ]);

  useEffect(() => {
    function handleKeyUp(event: KeyboardEvent) {
      if (activeView !== "projects" || selectedTaskId) {
        return;
      }

      if (event.key === "Shift" || event.key === " ") {
        dispatchProjectBoardLift(false);
      }
    }

    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [activeView, selectedTaskId]);

  useEffect(() => {
    function handleCloseGoalPanel() {
      setSelectedGoalId("");
      clearKeySequence();
    }

    window.addEventListener("lira:close-goal-panel", handleCloseGoalPanel);

    return () => {
      window.removeEventListener("lira:close-goal-panel", handleCloseGoalPanel);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedVaultPath = readStoredVaultPath(window.localStorage);

    if (!shouldAutoInitializeDevelopmentVault(storedVaultPath, import.meta.env.DEV)) {
      return;
    }

    void initializeVault(vaultPath)
      .then((initializedVaultPath) => {
        setVaultPath(initializedVaultPath);
        setPendingVaultPath(initializedVaultPath);
        window.localStorage.setItem(vaultPathStorageKey, initializedVaultPath);
      })
      .catch(() => {
        // Leave the development default unpersisted if initialization fails.
      });
  }, [vaultPath]);

  useEffect(() => {
    if (!settingsOpen) {
      setPendingThemeId(activeThemeId);
      setPendingAccentToken(activeAccentToken);
      setPendingProfileName(profile.name);
      setPendingProfilePicture(profile.profilePicture);
      setPendingVaultPath(vaultPath);
    }
  }, [activeAccentToken, activeThemeId, profile, settingsOpen, vaultPath]);

  useEffect(() => {
    let cancelled = false;
    const initialItemMutationVersion = itemMutationVersionRef.current;

    if (!vaultPath) {
      setItems([]);
      setLoadedItemVaultPath("");
      return;
    }

    void loadWorkspaceItems(vaultPath)
      .then((loadedItems) => {
        if (!cancelled) {
          if (itemMutationVersionRef.current === initialItemMutationVersion) {
            setItems(loadedItems);
          }
          setLoadedItemVaultPath(vaultPath);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setLoadedItemVaultPath("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vaultPath]);

  useEffect(() => {
    let cancelled = false;
    const initialDocMutationVersion = docMutationVersionRef.current;

    if (!vaultPath) {
      setDocs([]);
      setLoadedDocVaultPath("");
      return;
    }

    void loadDocs(vaultPath)
      .then((loadedDocs) => {
        if (!cancelled) {
          if (docMutationVersionRef.current === initialDocMutationVersion) {
            setDocs(loadedDocs);
          }
          setLoadedDocVaultPath(vaultPath);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocs([]);
          setLoadedDocVaultPath("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vaultPath]);

  useEffect(() => {
    let cancelled = false;
    const initialProjectMutationVersion = projectMutationVersionRef.current;

    if (!vaultPath) {
      setProjects([]);
      setLoadedProjectVaultPath("");
      return;
    }

    void loadProjects(vaultPath)
      .then((loadedProjects) => {
        if (!cancelled) {
          if (projectMutationVersionRef.current === initialProjectMutationVersion) {
            setProjects(loadedProjects);
          }
          setLoadedProjectVaultPath(vaultPath);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
          setLoadedProjectVaultPath("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vaultPath]);

  useEffect(() => {
    if (!projects.length) {
      return;
    }

    void mutateItems((current) => attachProjectIdsFromNames(current, projects));
  }, [projects]);







  useEffect(() => {
    let cancelled = false;

    if (!vaultPath) {
      setProfile(defaultProfile);
      setLoadedProfileVaultPath("");
      return;
    }

    void loadProfile(vaultPath)
      .then((loadedProfile) => {
        if (cancelled) {
          return;
        }

        setProfile(loadedProfile ?? defaultProfile);
        setLoadedProfileVaultPath(vaultPath);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setProfile(defaultProfile);
        setLoadedProfileVaultPath(vaultPath);
      });

    return () => {
      cancelled = true;
    };
  }, [vaultPath]);



  function buildNavigationLocation(
    overrides: Partial<NavigationLocation> = {},
  ): NavigationLocation {
    return {
      view: activeView,
      selectedProjectId,
      selectedGoalId,
      selectedTaskId,
      selectedDocId,
      ...overrides,
    };
  }

  function applyNavigationLocation(location: NavigationLocation) {
    setActiveView(location.view);
    setSelectedProjectId(location.selectedProjectId);
    setSelectedGoalId(location.selectedGoalId);
    setSelectedTaskId(location.selectedTaskId);
    setSelectedDocId(location.selectedDocId);
  }

  function navigateToLocation(
    location: NavigationLocation,
    options?: {
      recordHistory?: boolean;
    },
  ) {
    const currentLocation = buildNavigationLocation();

    if (options?.recordHistory !== false && !locationsMatch(currentLocation, location)) {
      const currentHistory = pageHistoryRef.current.slice(0, pageHistoryIndexRef.current + 1);
      const lastVisitedLocation = currentHistory[currentHistory.length - 1];

      if (!lastVisitedLocation || !locationsMatch(lastVisitedLocation, location)) {
        currentHistory.push(location);
      }

      pageHistoryRef.current = currentHistory;
      pageHistoryIndexRef.current = currentHistory.length - 1;
    }

    applyNavigationLocation(location);
  }

  function navigateToPage(
    view: ViewId,
    options?: {
      clearTaskSelection?: boolean;
      recordHistory?: boolean;
    },
  ) {
    navigateToLocation(
      buildNavigationLocation({
        view,
        selectedTaskId: view === "tasks" && options?.clearTaskSelection ? "" : selectedTaskId,
      }),
      { recordHistory: options?.recordHistory },
    );
  }

  function navigatePageHistory(offset: 1 | -1) {
    const nextIndex = pageHistoryIndexRef.current + offset;

    if (nextIndex < 0 || nextIndex >= pageHistoryRef.current.length) {
      return;
    }

    pageHistoryIndexRef.current = nextIndex;
    navigateToLocation(pageHistoryRef.current[nextIndex], { recordHistory: false });
  }

  function navigateToProject(projectId: string) {
    navigateToLocation(
      buildNavigationLocation({
        view: "projects",
        selectedProjectId: projectId,
      }),
    );
  }

  function navigateToTask(taskId: string) {
    navigateToLocation(
      buildNavigationLocation({
        view: "tasks",
        selectedTaskId: taskId,
      }),
    );
  }

  function navigateToGoal(goalId: string) {
    navigateToLocation(
      buildNavigationLocation({
        view: "goals",
        selectedGoalId: goalId,
      }),
    );
  }

  function navigateToDoc(docId: string) {
    navigateToLocation(
      buildNavigationLocation({
        view: "docs",
        selectedDocId: docId,
      }),
    );
  }

  function navigateToInboxItem(_itemId: string) {
    navigateToPage("inbox");
  }

  function openCommandPalette() {
    rememberMainPanelFocus();
    setCommandPaletteOpen(true);
  }

  function closeCommandPalette() {
    setCommandPaletteOpen(false);
    restoreMainPanelFocus();
  }

  function openCommandLauncher() {
    rememberMainPanelFocus();
    setCommandLauncherOpen(true);
  }

  function closeCommandLauncher() {
    setCommandLauncherOpen(false);
    restoreMainPanelFocus();
  }

  function closeListPalette() {
    setListPaletteKind(null);
    restoreMainPanelFocus();
  }

  function openQuickCapture() {
    rememberMainPanelFocus();
    setQuickCaptureOpen(true);
  }

  function closeQuickCapture() {
    setQuickCaptureOpen(false);
    restoreMainPanelFocus();
  }

  function openNewGoal(goalId = "") {
    rememberMainPanelFocus();
    setEditingGoalId(goalId);
    setNewGoalOpen(true);
  }

  function closeNewGoal() {
    setNewGoalOpen(false);
    setEditingGoalId("");
    restoreMainPanelFocus();
  }

  function openNewTask() {
    rememberMainPanelFocus();
    setNewTaskOpen(true);
  }

  function closeNewTask() {
    setNewTaskOpen(false);
    restoreMainPanelFocus();
  }

  function openNewDoc() {
    rememberMainPanelFocus();
    setNewDocOpen(true);
  }

  function closeNewDoc() {
    setNewDocOpen(false);
    restoreMainPanelFocus();
  }

  function openNewProject() {
    rememberMainPanelFocus();
    setNewProjectOpen(true);
  }

  function closeNewProject() {
    setNewProjectOpen(false);
    restoreMainPanelFocus();
  }

  function openTaskDetailInView(taskId: string, view: "tasks" | "projects") {
    navigateToLocation(
      buildNavigationLocation({
        view,
        selectedTaskId: taskId,
      }),
    );
  }

  function closeTaskDetailInView(view: "tasks" | "projects") {
    navigateToLocation(
      buildNavigationLocation({
        view,
        selectedTaskId: "",
      }),
    );
  }

  function closeDocDetail() {
    if (
      pageHistoryRef.current[pageHistoryIndexRef.current]?.view === "docs" &&
      pageHistoryIndexRef.current > 0
    ) {
      navigatePageHistory(-1);
      return;
    }

    navigateToLocation(
      buildNavigationLocation({
        view: "dashboard",
        selectedDocId: "",
      }),
    );
  }

  function handleSelectTask(taskId: string) {
    if (taskId) {
      openTaskDetailInView(taskId, "tasks");
      return;
    }

    closeTaskDetailInView("tasks");
  }

  function handleSelectProjectTask(taskId: string) {
    openTaskDetailInView(taskId, "projects");
  }

  function openListPalette(kind: ListPaletteKind) {
    rememberMainPanelFocus();

    if ((kind === "docs" || kind === "project-docs") && loadedDocVaultPath !== vaultPath) {
      setListPaletteKind(kind);
      return;
    }

    const configs = {
      projects: { count: projects.length, emptyMessage: "No projects yet." },
      tasks: { count: taskItems.length, emptyMessage: "No tasks yet." },
      goals: { count: goalItems.length, emptyMessage: "No goals yet." },
      inbox: { count: inboxItems.length, emptyMessage: "No inbox items yet." },
      docs: { count: docItems.length, emptyMessage: "No docs yet." },
      "project-docs": { count: projectDocItems.length, emptyMessage: "No docs linked to this project yet." },
    } satisfies Record<ListPaletteKind, { count: number; emptyMessage: string }>;

    const config = configs[kind];

    if (config.count > 0) {
      setListPaletteKind(kind);
      return;
    }

    setToastMessage(config.emptyMessage);
  }

  function openSettings() {
    rememberMainPanelFocus();
    setPendingThemeId(activeThemeId);
    setPendingAccentToken(activeAccentToken);
    setPendingProfileName(profile.name);
    setPendingProfilePicture(profile.profilePicture);
    setPendingVaultPath(vaultPath);
    setVaultError("");
    setSettingsOpen(true);
  }

  function closeSettings() {
    resetPreview();
    setPendingThemeId(activeThemeId);
    setPendingAccentToken(activeAccentToken);
    setPendingProfileName(profile.name);
    setPendingProfilePicture(profile.profilePicture);
    setPendingVaultPath(vaultPath);
    setVaultError("");
    setSettingsOpen(false);
    restoreMainPanelFocus();
  }

  function handleThemePreview(themeId: string) {
    setPendingThemeId(themeId);
    previewTheme(themeId, pendingAccentToken);
  }

  function handleAccentPreview(accentToken: ThemeColorToken) {
    setPendingAccentToken(accentToken);
    previewTheme(pendingThemeId, accentToken);
  }

  async function handleConfirmSettings() {
    applyThemeSelection(pendingThemeId, pendingAccentToken);
    setVaultError("");

    const nextVaultPath = pendingVaultPath.trim();
    const nextProfile = {
      name: pendingProfileName.trim() || defaultProfile.name,
      profilePicture: pendingProfilePicture,
    };
    let resolvedVaultPath = nextVaultPath;

    if (nextVaultPath) {
      try {
        const initializedVaultPath = await initializeVault(nextVaultPath);

        resolvedVaultPath = initializedVaultPath;
      } catch (error) {
        setVaultError(
          error instanceof Error ? error.message : "Failed to initialize vault path.",
        );
        return;
      }
    } else {
      setVaultPath("");
      window.localStorage.removeItem(vaultPathStorageKey);
      setProfile(nextProfile);
      setSettingsOpen(false);
      restoreMainPanelFocus();
      return;
    }

    try {
      await saveProfile(resolvedVaultPath, nextProfile);
    } catch (error) {
      setToastMessage(formatPersistenceError("save profile", error), "warning");
      return;
    }

    setVaultPath(resolvedVaultPath);
    window.localStorage.setItem(vaultPathStorageKey, resolvedVaultPath);
    setProfile(nextProfile);
    setSettingsOpen(false);
    restoreMainPanelFocus();
  }

  async function handleBrowseVault() {
    setVaultError("");
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: pendingVaultPath || undefined,
      title: "Select vault directory",
    });

    if (typeof selected === "string") {
      setPendingVaultPath(selected);
    }
  }

  function handleSelectPage(item: CommandPaletteItem) {
    navigateToPage(item.id as ViewId, {
      clearTaskSelection: item.id === "tasks",
    });
    setCommandPaletteOpen(false);
  }

  function handleSelectListItem(item: CommandPaletteItem) {
    if (listPaletteKind === "projects") {
      navigateToProject(item.id);
    }

    if (listPaletteKind === "tasks") {
      navigateToTask(item.id);
    }

    if (listPaletteKind === "goals") {
      navigateToGoal(item.id);
    }

    if (listPaletteKind === "inbox") {
      navigateToInboxItem(item.id);
    }

    if (listPaletteKind === "docs" || listPaletteKind === "project-docs") {
      navigateToDoc(item.id);
    }

    setListPaletteKind(null);
  }

  function handleCaptureThought(value: string) {
    const text = value.trim();

    if (!text || !vaultPath) {
      return;
    }

    const timestamp = getCurrentTimestamp();

    void mutateItems(
      (current) => [
        {
          id: `item-${Date.now()}`,
          kind: "capture",
          state: "inbox",
          sourceType: "capture",
          title: text,
          content: text,
          createdAt: timestamp,
          updatedAt: timestamp,
          tags: [],
          projectId: undefined,
          project: "",
          isCompleted: false,
          priority: "",
          dueDate: "",
          completedAt: "",
          estimate: "",
          goalMetric: "tasks_completed",
          goalTarget: 1,
          goalProgress: 0,
          goalProgressByDate: {},
          goalPeriod: "weekly",
        },
        ...current,
      ],
      {
        successMessage: "Inbox item saved to vault.",
        onSuccess: () => {
          setQuickCaptureOpen(false);
        },
      },
    );
  }

  function handleCreateTask(task: {
    title: string;
    description: string;
    projectId: string;
    goalId: string;
    projectLaneId?: string;
    isCompleted?: boolean;
    openDetailOnSuccess?: boolean;
  }) {
    const timestamp = getCurrentTimestamp();
    const nextTaskId = `item-${Date.now()}`;
    const isCompleted = task.isCompleted ?? false;
    const nextTask: Item = {
      id: nextTaskId,
      kind: "task",
      state: "active",
      sourceType: "manual",
      title: task.title,
      content: getInitialTaskDescription(projects, task.projectId || undefined, task.description),
      createdAt: timestamp,
      updatedAt: timestamp,
      tags: [],
      projectId: task.projectId || undefined,
      projectLaneId: task.projectLaneId || getDefaultProjectLaneId(projects, task.projectId),
      project: getProjectName(projects, task.projectId, ""),
      isCompleted,
      priority: "",
      dueDate: "",
      completedAt: isCompleted ? getTodayDateString() : "",
      estimate: "",
      customFieldValues: getInitialTaskCustomFieldValues(projects, task.projectId || undefined),
      goalMetric: "tasks_completed",
      goalTarget: 1,
      goalProgress: 0,
      goalProgressByDate: {},
      goalPeriod: "weekly",
    };

    void mutateItems(
      (current) => {
        if (!task.goalId) {
          return [...current, nextTask];
        }

        const linkedGoal = current.find(
          (item) =>
            item.id === task.goalId &&
            item.kind === "goal" &&
            item.goalMetric === "tasks_completed",
        );

        if (!linkedGoal) {
          return [...current, nextTask];
        }

        if (linkedGoal.goalScope?.projectId) {
          return [...current, nextTask];
        }

        const existingTaskIds = linkedGoal.goalScope?.taskIds ?? [];

        if (existingTaskIds.length >= linkedGoal.goalTarget) {
          return current;
        }

        return [
          ...current.map((item) =>
            item.id === linkedGoal.id
              ? {
                  ...item,
                  goalScope: {
                    ...item.goalScope,
                    taskIds: [...existingTaskIds, nextTaskId],
                  },
                  updatedAt: timestamp,
                }
              : item,
          ),
          nextTask,
        ];
      },
      {
        successMessage: "Task saved to vault.",
        onSuccess: () => {
          if (task.openDetailOnSuccess !== false) {
            setSelectedTaskId(nextTask.id);
          }
          setNewTaskOpen(false);
        },
      },
    );

    return nextTaskId;
  }

  function handleCreateDoc(doc: {
    title: string;
    body: string;
    projectId: string;
    openDetailOnSuccess?: boolean;
  }) {
    if (!vaultPath || loadedDocVaultPath !== vaultPath) {
      setToastMessage("Failed to save docs: vault is not ready", "warning");
      return;
    }

    const timestamp = getCurrentTimestamp();
    const nextDoc: Doc = {
      id: `doc-${Date.now()}`,
      title: doc.title,
      body: doc.body,
      projectId: doc.projectId || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    void persistCreateDoc(vaultPath, nextDoc)
      .then((savedDoc) => {
        docMutationVersionRef.current += 1;
        setDocs((current) => [savedDoc, ...current]);
        setToastMessage("Doc saved to vault.", "success");
        setNewDocOpen(false);

        if (doc.openDetailOnSuccess !== false) {
          navigateToDoc(savedDoc.id);
        }
      })
      .catch((error) => {
        setToastMessage(formatPersistenceError("save doc", error), "warning");
      });
  }

  function handleCreateGoal(goal: {
    title: string;
    description: string;
    target: number;
    period: Item["goalPeriod"];
    metric?: Item["goalMetric"];
    projectId: string;
    scheduleDays: NonNullable<Item["goalScheduleDays"]>;
    milestones: NonNullable<Item["goalMilestones"]>;
  }) {
    const timestamp = getCurrentTimestamp();
    const nextGoal: Item = {
      id: `item-${Date.now()}`,
      kind: "goal",
      state: "active",
      sourceType: "manual",
      title: goal.title,
      content: goal.description,
      createdAt: timestamp,
      updatedAt: timestamp,
      tags: [],
      projectId: goal.projectId || undefined,
      project: getProjectName(projects, goal.projectId, ""),
      isCompleted: false,
      priority: "",
      dueDate: "",
      completedAt: "",
      estimate: "",
      goalMetric: goal.metric,
      goalTarget: goal.target,
      goalProgress: 0,
      goalProgressByDate: {},
      goalPeriod: goal.period,
      goalScheduleDays: goal.scheduleDays,
      goalMilestones: goal.milestones,
      goalScope:
        goal.metric === "tasks_completed" && goal.projectId
          ? { projectId: goal.projectId }
          : undefined,
    };

    void mutateItems(
      (current) => [nextGoal, ...current],
      {
        successMessage: "Goal saved to vault.",
        onSuccess: () => {
          setNewGoalOpen(false);
          setEditingGoalId("");
          navigateToGoal(nextGoal.id);
        },
      },
    );
  }

  function handleOpenEditGoal(goalId: string) {
    openNewGoal(goalId);
  }

  function handleEditGoal(goal: {
    title: string;
    description: string;
    target: number;
    period: Item["goalPeriod"];
    metric?: Item["goalMetric"];
    projectId: string;
    scheduleDays: NonNullable<Item["goalScheduleDays"]>;
    milestones: NonNullable<Item["goalMilestones"]>;
  }) {
    if (!editingGoalId) {
      return;
    }

    const timestamp = getCurrentTimestamp();

    void mutateItems(
      (current) =>
        current.map((item) =>
          item.id === editingGoalId && item.kind === "goal"
            ? {
                ...item,
                title: goal.title,
                content: goal.description,
                projectId: goal.projectId || undefined,
                project: getProjectName(projects, goal.projectId, ""),
                goalMetric: goal.metric,
                goalTarget: goal.target,
                goalPeriod: goal.period,
                goalScheduleDays: goal.scheduleDays,
                goalMilestones: goal.milestones,
                goalScope:
                  goal.metric === "tasks_completed"
                    ? {
                        ...item.goalScope,
                        projectId: goal.projectId || undefined,
                      }
                    : undefined,
                updatedAt: timestamp,
              }
            : item,
        ),
      {
        successMessage: "Goal updated.",
        onSuccess: () => {
          setSelectedGoalId(editingGoalId);
          setNewGoalOpen(false);
          setEditingGoalId("");
        },
      },
    );
  }

  function handleCreateProject(project: {
    name: string;
    description: string;
    hasKanbanBoard: boolean;
  }) {
    const timestamp = new Date().toISOString();
    const nextProjectId = `project-${Date.now()}`;
    const nextProject: Project = {
      id: nextProjectId,
      name: project.name,
      description: project.description,
      hasKanbanBoard: project.hasKanbanBoard,
      taskTemplate: undefined,
      boardLanes: project.hasKanbanBoard ? defaultProjectBoardLanes(nextProjectId) : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    void mutateProjects(
      (current) => [nextProject, ...current],
      {
        successMessage: "Project saved to vault.",
        onSuccess: () => {
          setNewProjectOpen(false);
          navigateToProject(nextProject.id);
        },
      },
    );
  }

  async function handleUpdateProject(projectId: string, updates: Partial<Project>) {
    return mutateProjects((current) => {
      const existingProject = current.find((project) => project.id === projectId);

      if (!existingProject) {
        return current;
      }

      const nextName = typeof updates.name === "string" ? updates.name.trim() : existingProject.name;
      const nextDescription =
        typeof updates.description === "string"
          ? updates.description.trim()
          : existingProject.description;
      const nextHasKanbanBoard =
        typeof updates.hasKanbanBoard === "boolean"
          ? updates.hasKanbanBoard
          : existingProject.hasKanbanBoard;
      const nextTaskTemplate =
        "taskTemplate" in updates
          ? updates.taskTemplate
          : existingProject.taskTemplate;
      let nextBoardLanes = updates.boardLanes ?? existingProject.boardLanes;

      if (nextHasKanbanBoard && nextBoardLanes.length === 0) {
        nextBoardLanes = defaultProjectBoardLanes(projectId);
      }

      const timestamp = new Date().toISOString();

      if (
        nextName === existingProject.name &&
        nextDescription === existingProject.description &&
        nextHasKanbanBoard === existingProject.hasKanbanBoard &&
        nextTaskTemplate === existingProject.taskTemplate &&
        nextBoardLanes === existingProject.boardLanes
      ) {
        return current;
      }

      return current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              name: nextName,
              description: nextDescription,
              hasKanbanBoard: nextHasKanbanBoard,
              taskTemplate: nextTaskTemplate,
              boardLanes: nextBoardLanes,
              updatedAt: timestamp,
            }
          : project,
      );
    });
  }

  function handleUpdateTask(taskId: string, updates: Partial<Item>) {
    if (!vaultPath || loadedItemVaultPath !== vaultPath) {
      setToastMessage("Failed to save workspace changes: vault is not ready", "warning");
      return;
    }

    const previousTask = items.find(
      (item): item is Item => item.id === taskId && item.kind === "task",
    );

    if (!previousTask) {
      return;
    }

    const timestamp = getCurrentTimestamp();
    const completionDate = getTodayDateString();
    const nextTask: Item = {
      ...previousTask,
      ...updates,
      completedAt:
        updates.isCompleted === true
          ? completionDate
          : updates.isCompleted === false
            ? ""
            : previousTask.completedAt,
      updatedAt: timestamp,
    };

    setItems((current) =>
      current.map((item) => {
        if (item.id !== taskId || item.kind !== "task") {
          return item;
        }

        return nextTask;
      }),
    );

    const requestVersion = (taskSaveRequestVersionRef.current.get(taskId) ?? 0) + 1;
    taskSaveRequestVersionRef.current.set(taskId, requestVersion);

    void persistTaskUpdate(vaultPath, taskPayloadFromWorkspaceItem(nextTask)).catch((error) => {
      if (taskSaveRequestVersionRef.current.get(taskId) !== requestVersion) {
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === taskId && item.kind === "task"
            ? previousTask
            : item,
        ),
      );
      setTaskDraftResetKeys((current) => ({
        ...current,
        [taskId]: (current[taskId] ?? 0) + 1,
      }));

      setToastMessage(formatPersistenceError("save task", error), "warning");
    });
  }

  function handleUpdateDoc(docId: string, updates: Partial<Doc>) {
    if (!vaultPath || loadedDocVaultPath !== vaultPath) {
      setToastMessage("Failed to save docs: vault is not ready", "warning");
      return;
    }

    const previousDoc = docs.find((doc): doc is Doc => doc.id === docId);

    if (!previousDoc) {
      return;
    }

    const timestamp = getCurrentTimestamp();
    const nextDoc: Doc = {
      ...previousDoc,
      ...updates,
      projectId:
        typeof updates.projectId === "string"
          ? updates.projectId || undefined
          : previousDoc.projectId,
      updatedAt: timestamp,
    };

    setDocs((current) =>
      current.map((doc) => (doc.id === docId ? nextDoc : doc)),
    );

    const requestVersion = (docSaveRequestVersionRef.current.get(docId) ?? 0) + 1;
    docSaveRequestVersionRef.current.set(docId, requestVersion);
    docMutationVersionRef.current += 1;

    void persistUpdateDoc(vaultPath, nextDoc).catch((error) => {
      if (docSaveRequestVersionRef.current.get(docId) !== requestVersion) {
        return;
      }

      setDocs((current) => current.map((doc) => (doc.id === docId ? previousDoc : doc)));
      setDocDraftResetKeys((current) => ({
        ...current,
        [docId]: (current[docId] ?? 0) + 1,
      }));
      setToastMessage(formatPersistenceError("save doc", error), "warning");
    });
  }

  function handleUpdateGoal(goalId: string, updates: Partial<Item>) {
    const timestamp = getCurrentTimestamp();

    void mutateItems((current) =>
      current.map((item) =>
        item.id === goalId
          ? {
              ...item,
              ...updates,
              tags:
                typeof updates.tags !== "undefined"
                  ? updates.tags
                  : item.tags,
              updatedAt: timestamp,
            }
          : item,
      ),
    );
  }



  function handleConvertCaptureToTask(itemId: string, projectId?: string) {
    const timestamp = getCurrentTimestamp();
    const nextTaskId = `item-${Date.now()}`;

    void mutateItems(
      (current) => {
        const capture = current.find((item) => item.id === itemId && item.kind === "capture");

        if (!capture) {
          return current;
        }

        const nextProjectId = projectId ?? capture.projectId;

        const nextTask: Item = {
          id: nextTaskId,
          kind: "task",
          state: "active",
          sourceType: "capture",
          title: capture.title,
          content: getInitialTaskDescription(projects, nextProjectId, capture.content),
          createdAt: timestamp,
          updatedAt: timestamp,
          tags: capture.tags,
          projectId: nextProjectId,
          projectLaneId: getDefaultProjectLaneId(projects, nextProjectId),
          project: getProjectName(projects, nextProjectId, capture.project),
          isCompleted: false,
          priority: "",
          dueDate: "",
          completedAt: "",
          estimate: "",
          sourceCaptureId: capture.id,
          customFieldValues: getInitialTaskCustomFieldValues(projects, nextProjectId),
          goalMetric: "tasks_completed",
          goalTarget: 1,
          goalProgress: 0,
          goalProgressByDate: {},
          goalPeriod: "weekly",
        };

        return current.flatMap((item) =>
          item.id === itemId
            ? [
                {
                  ...item,
                  kind: "capture",
                  state: "active",
                  updatedAt: timestamp,
                },
                nextTask,
              ]
            : [item],
        );
      },
      {
        onSuccess: () => {
          navigateToTask(nextTaskId);
        },
      },
    );
  }

  function handleConvertCaptureToGoal(itemId: string, projectId?: string) {
    const timestamp = getCurrentTimestamp();
    const nextGoalId = `item-${Date.now()}`;

    void mutateItems(
      (current) => {
        const capture = current.find((item) => item.id === itemId && item.kind === "capture");

        if (!capture) {
          return current;
        }

        const nextProjectId = projectId ?? capture.projectId;

        const nextGoal: Item = {
          id: nextGoalId,
          kind: "goal",
          state: "active",
          sourceType: "capture",
          title: capture.title,
          content: capture.content,
          createdAt: timestamp,
          updatedAt: timestamp,
          tags: capture.tags,
          projectId: nextProjectId,
          project: getProjectName(projects, nextProjectId, capture.project),
          isCompleted: false,
          priority: "",
          dueDate: "",
          completedAt: "",
          estimate: "",
          goalMetric: undefined,
          goalTarget: 1,
          goalProgress: 0,
          goalProgressByDate: {},
          goalPeriod: "weekly",
        };

        return current.flatMap((item) =>
          item.id === itemId
            ? [
                {
                  ...item,
                  kind: "capture",
                  state: "active",
                  updatedAt: timestamp,
                },
                nextGoal,
              ]
            : [item],
        );
      },
      {
        onSuccess: () => {
          navigateToGoal(nextGoalId);
        },
      },
    );
  }

  function handleUpdateCaptureState(
    itemId: string,
    state: Extract<Item["state"], "inbox" | "someday" | "active" | "archived">,
  ) {
    const timestamp = getCurrentTimestamp();

    void mutateItems((current) =>
      current.map((item) =>
        item.id === itemId && item.kind === "capture"
          ? { ...item, state, updatedAt: timestamp }
          : item,
      ),
    );
  }

  function handleDeleteItem(itemId: string) {
    void mutateItems(
      (current) => {
        const deletedItem = current.find((item) => item.id === itemId);

        if (!deletedItem) {
          return current;
        }

        return current
          .filter((item) => item.id !== itemId)
          .map((item) =>
            deletedItem.kind === "task" && item.kind === "goal"
              ? {
                  ...item,
                  goalScope: pruneGoalScopeTaskId(item.goalScope, itemId),
                }
              : item,
          );
      },
      {
        onSuccess: () => {
          setSelectedTaskId((current) => (current === itemId ? "" : current));
          setSelectedGoalId((current) => (current === itemId ? "" : current));
        },
      },
    );
  }

  function handleDeleteDoc(docId: string) {
    if (!vaultPath || loadedDocVaultPath !== vaultPath) {
      setToastMessage("Failed to save docs: vault is not ready", "warning");
      return;
    }

    const deletedDoc = docs.find((doc) => doc.id === docId);

    if (!deletedDoc) {
      return;
    }

    void persistDeleteDoc(vaultPath, docId)
      .then(() => {
        docMutationVersionRef.current += 1;
        setDocs((current) => current.filter((doc) => doc.id !== docId));
        setToastMessage(`Doc "${deletedDoc.title}" deleted`);
        setSelectedDocId((current) => (current === docId ? "" : current));

        if (selectedDocId === docId || activeView === "docs") {
          closeDocDetail();
        }
      })
      .catch((error) => {
        setToastMessage(formatPersistenceError("delete doc", error), "warning");
      });
  }

  function handleSelectCommand(item: CommandPaletteItem) {
    setCommandLauncherOpen(false);

    if (item.id === "go-to-page") {
      setCommandPaletteOpen(true);
      return;
    }

    if (item.id === "new-inbox-item") {
      setQuickCaptureOpen(true);
      return;
    }

    if (item.id === "new-task") {
      setNewTaskOpen(true);
      return;
    }

    if (item.id === "new-doc") {
      setNewDocOpen(true);
      return;
    }

    if (item.id === "new-goal") {
      setNewGoalOpen(true);
      return;
    }

    if (item.id === "new-project") {
      setNewProjectOpen(true);
      return;
    }

    if (item.id === "settings") {
      openSettings();
      return;
    }

    if (item.id === "right-rail-cycle") {
      cycleRightRailMode();
      return;
    }

    if (item.id === "right-rail-pin") {
      applyRightRailMode("pinned");
      return;
    }

    if (item.id === "right-rail-hide") {
      applyRightRailMode("hidden");
      return;
    }

    if (item.id === "right-rail-auto") {
      applyRightRailMode("auto");
    }
  }

  return (
    <>
      <div className="app-shell">
        <button
          type="button"
          className="app-shell__avatar-anchor"
          onClick={() => navigateToPage("dashboard")}
          aria-label="Open dashboard"
          title="Dashboard"
        >
          <span className="app-shell__avatar" aria-hidden="true">
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt=""
                className="app-shell__avatar-image"
              />
            ) : (
              (profile.name.trim() || defaultProfile.name).slice(0, 1).toUpperCase()
            )}
          </span>
        </button>

        <main className="main-panel">
          <div ref={mainPanelContentRef} className="main-panel__content">
            <PageContent
              activeView={activeView}
              items={items}
              docs={docs}
              todayDate={todayDate}
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedGoalId={selectedGoalId}
              selectedTaskId={selectedTaskId}
              selectedDocId={selectedDocId}
              onSelectGoal={setSelectedGoalId}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteItem}
              onEditGoal={handleOpenEditGoal}
              onCreateTask={handleCreateTask}
              onSelectTask={handleSelectTask}
              onOpenProjectTask={handleSelectProjectTask}
              onCloseTaskDetail={closeTaskDetailInView}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteItem}
              onCloseDocDetail={closeDocDetail}
              onUpdateDoc={handleUpdateDoc}
              onDeleteDoc={handleDeleteDoc}
              onUpdateProject={handleUpdateProject}
              onCreateCapture={handleCaptureThought}
              onConvertCaptureToTask={handleConvertCaptureToTask}
              onConvertCaptureToGoal={handleConvertCaptureToGoal}
              onUpdateCaptureState={handleUpdateCaptureState}
              onDeleteCapture={handleDeleteItem}
              onNotify={setToastMessage}
              onOpenGoalFromDashboard={navigateToGoal}
              rightRailMode={rightRailMode}
              taskDraftResetKeys={taskDraftResetKeys}
              docDraftResetKeys={docDraftResetKeys}
            />
          </div>
        </main>
      </div>

      {!vaultPath ? (
        <div className="app-warning" role="alert">
          No vault is configured. Set a vault in Settings before capturing or storing data.
        </div>
      ) : null}

      {toastNotification ? (
        <div
          className={`app-toast app-toast--${toastNotification.type}`}
          role="status"
          aria-live="polite"
        >
          {toastNotification.type === "inform" ? (
            <InfoIcon className="app-toast__icon" />
          ) : toastNotification.type === "success" ? (
            <CheckCircleIcon className="app-toast__icon" />
          ) : (
            <AlertTriangleIcon className="app-toast__icon" />
          )}
          <span>{toastNotification.message}</span>
        </div>
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          activeSection={settingsSection}
          onSectionChange={setSettingsSection}
          themes={themes}
          pendingThemeId={pendingThemeId}
          accentOptions={accentOptions}
          pendingAccentToken={pendingAccentToken}
          pendingProfileName={pendingProfileName}
          pendingProfilePicture={pendingProfilePicture}
          pendingVaultPath={pendingVaultPath}
          vaultError={vaultError}
          onPreviewTheme={handleThemePreview}
          onAccentTokenChange={handleAccentPreview}
          onProfileNameChange={setPendingProfileName}
          onProfilePictureChange={setPendingProfilePicture}
          onVaultPathChange={setPendingVaultPath}
          onBrowseVault={handleBrowseVault}
          onClose={closeSettings}
          onConfirm={handleConfirmSettings}
        />
      ) : null}

      <CommandPalette
        title="Go To Page"
        placeholder="go to page"
        items={pageItems}
        isOpen={commandPaletteOpen}
        emptyMessage="No pages match that query."
        onClose={closeCommandPalette}
        onSelect={handleSelectPage}
      />

      <CommandPalette
        title={listPaletteConfig?.title ?? "List"}
        placeholder={listPaletteConfig?.placeholder ?? "list"}
        items={listPaletteConfig?.items ?? []}
        isOpen={listPaletteKind !== null}
        emptyMessage={listPaletteConfig?.emptyMessage ?? "No items match that query."}
        onClose={closeListPalette}
        onSelect={handleSelectListItem}
      />

      <CommandPalette
        title="Commands"
        placeholder=":"
        items={commandItems}
        isOpen={commandLauncherOpen}
        emptyMessage="No commands match that query."
        onClose={closeCommandLauncher}
        onSelect={handleSelectCommand}
      />

      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={closeQuickCapture}
        onSubmit={handleCaptureThought}
      />

      <NewTaskModal
        isOpen={newTaskOpen}
        onClose={closeNewTask}
        goals={items
          .filter(
            (item) =>
              item.kind === "goal" &&
              item.state !== "deleted" &&
              item.goalMetric === "tasks_completed",
          )
          .map((goal) => ({
            id: goal.id,
            title: goal.title,
            projectId: goal.goalScope?.projectId,
          }))}
        projects={projects}
        onSubmit={handleCreateTask}
      />

      <NewDocModal
        isOpen={newDocOpen}
        onClose={closeNewDoc}
        projects={projects}
        onSubmit={handleCreateDoc}
      />

      <NewGoalModal
        isOpen={newGoalOpen}
        onClose={closeNewGoal}
        projects={projects}
        initialGoal={
          editingGoalId
            ? (() => {
                const goal = items.find(
                  (item) => item.id === editingGoalId && item.kind === "goal",
                );

                if (!goal) {
                  return undefined;
                }

                return {
                  title: goal.title,
                  description: goal.content,
                  target: goal.goalTarget,
                  period: goal.goalPeriod,
                  metric: goal.goalMetric,
                  projectId: goal.goalScope?.projectId ?? goal.projectId ?? "",
                  scheduleDays: goal.goalScheduleDays ?? [],
                  milestones: goal.goalMilestones ?? [],
                };
              })()
            : undefined
        }
        onSubmit={editingGoalId ? handleEditGoal : handleCreateGoal}
      />

      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={closeNewProject}
        onSubmit={handleCreateProject}
      />
    </>
  );
}
