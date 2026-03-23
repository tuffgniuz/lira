import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { CommandPalette } from "@/components/navigation/command-palette";
import type { CommandPaletteItem } from "@/components/navigation/command-palette";
import {
  ArrowTurnIcon,
  BurgerIcon,
  CollapseSidebarIcon,
  LayersIcon,
  SettingsIcon,
  SparkIcon,
} from "@/components/icons";
import type { ViewId } from "@/app/navigation/types";
import {
  readStoredVaultPath,
  navigationItems,
  vaultPathStorageKey,
} from "@/app/navigation/navigation";
import {
  leaderKey, listGoalsSequence, listInboxItemsSequence, listProjectsSequence,
  listTasksSequence, mappedSequences, newGoalSequence, newInboxItemSequence,
  newProjectSequence, newTaskSequence, normalizeMappedKey, pageSequence, sequenceStartsWith,
} from "@/app/navigation/keymappings";

import { loadProfile, saveProfile } from "@/services/profile";
import { loadProjects, saveProjects } from "@/services/projects";
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
import { NewTaskModal } from "@/components/actions/new-task-modal";
import { PageContent } from "./page-content";

const defaultProfile: UserProfile = {
  name: "User",
  profilePicture: "",
};

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

type ListPaletteKind = "projects" | "tasks" | "goals" | "inbox";
type NavigationLocation = {
  view: ViewId;
  selectedProjectId: string;
  selectedGoalId: string;
  selectedTaskId: string;
};

function locationsMatch(left: NavigationLocation, right: NavigationLocation) {
  return (
    left.view === right.view &&
    left.selectedProjectId === right.selectedProjectId &&
    left.selectedGoalId === right.selectedGoalId &&
    left.selectedTaskId === right.selectedTaskId
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
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
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
  const [loadedProjectVaultPath, setLoadedProjectVaultPath] = useState("");
  const [, setLoadedProfileVaultPath] = useState("");
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [pendingProfileName, setPendingProfileName] = useState(defaultProfile.name);
  const [pendingProfilePicture, setPendingProfilePicture] = useState(
    defaultProfile.profilePicture,
  );
  const todayDate = getTodayDateString();
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskDraftResetKeys, setTaskDraftResetKeys] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [listPaletteKind, setListPaletteKind] = useState<ListPaletteKind | null>(null);
  const [commandLauncherOpen, setCommandLauncherOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState("");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const keySequenceRef = useRef<string[]>([]);
  const keySequenceTimeoutRef = useRef<number | null>(null);
  const itemMutationVersionRef = useRef(0);
  const projectMutationVersionRef = useRef(0);
  const taskSaveRequestVersionRef = useRef(new Map<string, number>());
  const pageHistoryRef = useRef<NavigationLocation[]>([
    {
      view: "dashboard",
      selectedProjectId: "",
      selectedGoalId: "",
      selectedTaskId: "",
    },
  ]);
  const pageHistoryIndexRef = useRef(0);

  const pageItems: CommandPaletteItem[] = navigationItems.map((item) => ({
    id: item.id,
    label: item.label,
    keywords: [item.id.replace("_", " "), item.label.toLowerCase()],
    icon: <item.icon className="nav-icon" />,
  }));
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
      setToastMessage("Failed to save workspace changes: vault is not ready");
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
      setToastMessage(formatPersistenceError("save workspace changes", error));
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
      setToastMessage("Failed to save projects: vault is not ready");
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
      setToastMessage(formatPersistenceError("save projects", error));
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
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const typingTarget = isTypingTarget(event.target);

      if (event.ctrlKey && event.code === "Backquote") {
        event.preventDefault();
        setSidebarExpanded((current) => !current);
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && settingsOpen) {
        event.preventDefault();
        closeSettings();
        return;
      }

      if (event.key === "Escape" && commandPaletteOpen) {
        event.preventDefault();
        setCommandPaletteOpen(false);
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && commandLauncherOpen) {
        event.preventDefault();
        setCommandLauncherOpen(false);
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && listPaletteKind) {
        event.preventDefault();
        setListPaletteKind(null);
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && quickCaptureOpen) {
        event.preventDefault();
        setQuickCaptureOpen(false);
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && newGoalOpen) {
        event.preventDefault();
        setNewGoalOpen(false);
        setEditingGoalId("");
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && newTaskOpen) {
        event.preventDefault();
        setNewTaskOpen(false);
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && newProjectOpen) {
        event.preventDefault();
        setNewProjectOpen(false);
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
        event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        if (event.key === "H") {
          event.preventDefault();
          navigatePageHistory(-1);
          clearKeySequence();
          return;
        }

        if (event.key === "L") {
          event.preventDefault();
          navigatePageHistory(1);
          clearKeySequence();
          return;
        }
      }

      if (event.key === ":") {
        event.preventDefault();
        setCommandLauncherOpen(true);
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
        setCommandPaletteOpen(true);
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

      if (nextSequence.join("") === newInboxItemSequence.join("")) {
        event.preventDefault();
        setQuickCaptureOpen(true);
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newGoalSequence.join("")) {
        event.preventDefault();
        setEditingGoalId("");
        setNewGoalOpen(true);
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newTaskSequence.join("")) {
        event.preventDefault();
        setNewTaskOpen(true);
        clearKeySequence();
        return;
      }

      if (nextSequence.join("") === newProjectSequence.join("")) {
        event.preventDefault();
        setNewProjectOpen(true);
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
    newProjectOpen,
    newTaskOpen,
    projects.length,
    quickCaptureOpen,
    selectedGoalId,
    selectedTaskId,
    settingsOpen,
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
          setLoadedItemVaultPath(vaultPath);
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
          setLoadedProjectVaultPath(vaultPath);
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
      ...overrides,
    };
  }

  function applyNavigationLocation(location: NavigationLocation) {
    setActiveView(location.view);
    setSelectedProjectId(location.selectedProjectId);
    setSelectedGoalId(location.selectedGoalId);
    setSelectedTaskId(location.selectedTaskId);
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

  function navigateToInboxItem(_itemId: string) {
    navigateToPage("inbox");
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
    const configs = {
      projects: { count: projects.length, emptyMessage: "No projects yet." },
      tasks: { count: taskItems.length, emptyMessage: "No tasks yet." },
      goals: { count: goalItems.length, emptyMessage: "No goals yet." },
      inbox: { count: inboxItems.length, emptyMessage: "No inbox items yet." },
    } satisfies Record<ListPaletteKind, { count: number; emptyMessage: string }>;

    const config = configs[kind];

    if (config.count > 0) {
      setListPaletteKind(kind);
      return;
    }

    setToastMessage(config.emptyMessage);
  }

  function openSettings() {
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
      return;
    }

    try {
      await saveProfile(resolvedVaultPath, nextProfile);
    } catch (error) {
      setToastMessage(formatPersistenceError("save profile", error));
      return;
    }

    setVaultPath(resolvedVaultPath);
    window.localStorage.setItem(vaultPathStorageKey, resolvedVaultPath);
    setProfile(nextProfile);
    setSettingsOpen(false);
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
    openDetailOnSuccess?: boolean;
  }) {
    const timestamp = getCurrentTimestamp();
    const nextTaskId = `item-${Date.now()}`;
    const nextTask: Item = {
      id: nextTaskId,
      kind: "task",
      state: "active",
      sourceType: "manual",
      title: task.title,
      content: task.description,
      createdAt: timestamp,
      updatedAt: timestamp,
      tags: [],
      projectId: task.projectId || undefined,
      projectLaneId: task.projectLaneId || getDefaultProjectLaneId(projects, task.projectId),
      project: getProjectName(projects, task.projectId, ""),
      isCompleted: false,
      priority: "",
      dueDate: "",
      completedAt: "",
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
    setEditingGoalId(goalId);
    setNewGoalOpen(true);
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
      setToastMessage("Failed to save workspace changes: vault is not ready");
      return;
    }

    const previousTask = items.find(
      (item): item is Item => item.id === taskId && item.kind === "task",
    );

    if (!previousTask) {
      return;
    }

    const timestamp = getCurrentTimestamp();
    const nextTask: Item = {
      ...previousTask,
      ...updates,
      completedAt:
        updates.isCompleted === true
          ? todayDate
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

      setToastMessage(formatPersistenceError("save task", error));
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
          content: capture.content,
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
      (current) => current.filter((item) => item.id !== itemId),
      {
        onSuccess: () => {
          setSelectedTaskId((current) => (current === itemId ? "" : current));
          setSelectedGoalId((current) => (current === itemId ? "" : current));
        },
      },
    );
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
    }
  }

  return (
    <>
      <div className="app-shell">
        <aside className={`sidebar ${sidebarExpanded ? "is-expanded" : "is-collapsed"}`}>
          <div className="sidebar__header">
            <button
              type="button"
              className="sidebar__brand"
              onClick={() => navigateToPage("dashboard")}
              aria-label="Open dashboard"
              title="Dashboard"
            >
              <span className="sidebar__avatar" aria-hidden="true">
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt=""
                    className="sidebar__avatar-image"
                  />
                ) : (
                  (profile.name.trim() || defaultProfile.name).slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="sidebar__brand-copy">
                <span className="sidebar__brand-name">
                  {(profile.name.trim() || defaultProfile.name).replace(/'$/, "")}
                  &apos;s Lira
                </span>
              </span>
            </button>

            <button
              type="button"
              className="sidebar__toggle"
              onClick={() => setSidebarExpanded((current) => !current)}
              aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-pressed={sidebarExpanded}
            >
              {sidebarExpanded ? (
                <CollapseSidebarIcon className="nav-icon" />
              ) : (
                <BurgerIcon className="nav-icon" />
              )}
            </button>
          </div>

          <div className="sidebar__section sidebar__section--primary">
            <nav className="nav-list" aria-label="Primary navigation">
              {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
              <button
                    key={item.id}
                    type="button"
                    className={`nav-button ${activeView === item.id ? "is-active" : ""}`}
                    onClick={() =>
                      navigateToPage(item.id, {
                        clearTaskSelection: item.id === "tasks",
                      })
                    }
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="sidebar__section sidebar__section--settings">
            <button
              type="button"
              className="nav-button"
              onClick={openSettings}
              aria-label="Settings"
              title="Settings"
            >
              <SettingsIcon className="nav-icon" />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        <main className="main-panel">
          <div className="main-panel__content">
            <PageContent
              activeView={activeView}
              items={items}
              todayDate={todayDate}
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedGoalId={selectedGoalId}
              selectedTaskId={selectedTaskId}
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
              onUpdateProject={handleUpdateProject}
              onCreateCapture={handleCaptureThought}
              onConvertCaptureToTask={handleConvertCaptureToTask}
              onConvertCaptureToGoal={handleConvertCaptureToGoal}
              onUpdateCaptureState={handleUpdateCaptureState}
              onDeleteCapture={handleDeleteItem}
              onNotify={setToastMessage}
              taskDraftResetKeys={taskDraftResetKeys}
            />
          </div>
        </main>
      </div>

      {!vaultPath ? (
        <div className="app-warning" role="alert">
          No vault is configured. Set a vault in Settings before capturing or storing data.
        </div>
      ) : null}

      {toastMessage ? (
        <div className="app-toast" role="status" aria-live="polite">
          {toastMessage}
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
        onClose={() => setCommandPaletteOpen(false)}
        onSelect={handleSelectPage}
      />

      <CommandPalette
        title={listPaletteConfig?.title ?? "List"}
        placeholder={listPaletteConfig?.placeholder ?? "list"}
        items={listPaletteConfig?.items ?? []}
        isOpen={listPaletteKind !== null}
        emptyMessage={listPaletteConfig?.emptyMessage ?? "No items match that query."}
        onClose={() => setListPaletteKind(null)}
        onSelect={handleSelectListItem}
      />

      <CommandPalette
        title="Commands"
        placeholder=":"
        items={commandItems}
        isOpen={commandLauncherOpen}
        emptyMessage="No commands match that query."
        onClose={() => setCommandLauncherOpen(false)}
        onSelect={handleSelectCommand}
      />

      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onSubmit={handleCaptureThought}
      />

      <NewTaskModal
        isOpen={newTaskOpen}
        onClose={() => {
          setNewTaskOpen(false);
        }}
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

      <NewGoalModal
        isOpen={newGoalOpen}
        onClose={() => {
          setNewGoalOpen(false);
          setEditingGoalId("");
        }}
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
        onClose={() => setNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
}
