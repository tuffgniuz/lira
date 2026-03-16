import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { CommandPalette } from "../../components/command-palette";
import type { CommandPaletteItem } from "../../components/command-palette";
import {
  ArrowTurnIcon,
  BurgerIcon,
  CollapseSidebarIcon,
  LayersIcon,
  SettingsIcon,
  SparkIcon,
} from "../../app/icons";
import {
  navigationItems,
  vaultPathStorageKey,
} from "../../app/navigation";
import {
  leaderKey,
  listProjectsSequence,
  mappedSequences,
  newGoalSequence,
  newInboxItemSequence,
  newProjectSequence,
  newTaskSequence,
  normalizeMappedKey,
  pageSequence,
  sequenceStartsWith,
} from "../../app/keymappings";
import type { ViewId } from "../../app/types";
import { loadItems, saveItems } from "../../lib/storage/items";
import {
  listJournalEntries,
  loadJournalEntry,
  saveJournalEntry,
} from "../../lib/storage/journal";
import { loadProjects, saveProjects } from "../../lib/storage/projects";
import { loadProfile, saveProfile } from "../../lib/storage/profile";
import {
  attachProjectIdsFromNames,
  clearProjectReferences,
  getProjectName,
} from "../../lib/domain/project-relations";
import {
  applyJournalEntryUpdates,
  upsertJournalSummary,
} from "../../lib/domain/journal-entry-state";
import type { Item } from "../../models/item";
import type { JournalEntry, JournalEntrySummary } from "../../models/journal";
import type { Project } from "../../models/project";
import type { UserProfile } from "../../models/profile";
import { NewGoalModal } from "../goals/new-goal-modal";
import { NewProjectModal } from "../projects/new-project-modal";
import { useTheme } from "../../theme/theme-provider";
import {
  formatThemeColorName,
  formatThemeColorToken,
  type ThemeColorToken,
} from "../../theme/theme-types";
import { QuickCaptureModal } from "../quick-capture/quick-capture-modal";
import { SettingsModal } from "../settings/settings-modal";
import { NewTaskModal } from "../tasks/new-task-modal";
import { PageContent } from "./page-content";

const defaultItems: Item[] = [
  {
    id: "item-task-example-1",
    kind: "task",
    state: "active",
    sourceType: "manual",
    title: "Design the first task workspace layout",
    content:
      "Validate the split list/detail approach before adding persistence or keyboard-specific interactions.",
    createdAt: "today",
    updatedAt: "today",
    tags: ["ui", "planning"],
    project: "Kenchi",
    taskStatus: "today",
    priority: "high",
    dueDate: "2026-03-18",
    completedAt: "",
    estimate: "45m",
    goalMetric: "tasks_completed",
    goalTarget: 1,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    goalTrackingMode: "automatic",
  },
  {
    id: "item-goal-example-1",
    kind: "goal",
    state: "active",
    sourceType: "manual",
    title: "Complete 3 tasks this week",
    content: "Keep task throughput steady without turning goals into a second inbox.",
    createdAt: "today",
    updatedAt: "today",
    tags: [],
    project: "",
    taskStatus: "inbox",
    priority: "",
    dueDate: "",
    completedAt: "",
    estimate: "",
    goalMetric: "tasks_completed",
    goalTarget: 3,
    goalProgress: 0,
    goalProgressByDate: {},
    goalPeriod: "weekly",
    goalTrackingMode: "automatic",
    goalScope: undefined,
  },
];

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

function createDefaultJournalEntry(date: string): JournalEntry {
  return {
    id: `journal-${date}`,
    date,
    morningIntention: "",
    diaryEntry: "",
    reflectionEntry: "",
    focuses: [],
    commitments: [],
    reflection: {
      wentWell: "",
      didntGoWell: "",
      learned: "",
      gratitude: "",
    },
    createdAt: "today",
    updatedAt: "today",
  };
}

function shiftDateString(date: string, amount: number) {
  const current = new Date(`${date}T00:00:00`);
  current.setDate(current.getDate() + amount);

  const year = current.getFullYear();
  const month = `${current.getMonth() + 1}`.padStart(2, "0");
  const day = `${current.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDefaultJournalSummaries(todayDate: string): JournalEntrySummary[] {
  return [
    {
      date: shiftDateString(todayDate, -1),
      preview: "Read the project instructions, finish the transcript review, close two tasks.",
    },
    {
      date: todayDate,
      preview: "Ship the review notes and tighten the journal interactions.",
    },
    {
      date: shiftDateString(todayDate, -2),
      preview: "Draft the daily goals layout and capture rough copy ideas.",
    },
    {
      date: shiftDateString(todayDate, -3),
      preview: "Sort inbox notes, clarify the next project milestone, keep scope narrow.",
    },
  ];
}

export function KenchiShell() {
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

    return window.localStorage.getItem(vaultPathStorageKey) ?? "";
  });
  const [pendingVaultPath, setPendingVaultPath] = useState(vaultPath);
  const [vaultError, setVaultError] = useState("");
  const [loadedItemVaultPath, setLoadedItemVaultPath] = useState("");
  const [loadedJournalVaultPath, setLoadedJournalVaultPath] = useState("");
  const [loadedProjectVaultPath, setLoadedProjectVaultPath] = useState("");
  const [loadedProfileVaultPath, setLoadedProfileVaultPath] = useState("");
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [pendingProfileName, setPendingProfileName] = useState(defaultProfile.name);
  const [pendingProfilePicture, setPendingProfilePicture] = useState(
    defaultProfile.profilePicture,
  );
  const todayDate = getTodayDateString();
  const [items, setItems] = useState<Item[]>(defaultItems);
  const [projects, setProjects] = useState<Project[]>([]);
  const [journalSummaries, setJournalSummaries] = useState<JournalEntrySummary[]>(() =>
    createDefaultJournalSummaries(todayDate),
  );
  const [selectedJournalDate, setSelectedJournalDate] = useState(todayDate);
  const [journalEntry, setJournalEntry] = useState<JournalEntry>(() =>
    createDefaultJournalEntry(todayDate),
  );
  const [todayJournalEntry, setTodayJournalEntry] = useState<JournalEntry>(() =>
    createDefaultJournalEntry(todayDate),
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [pendingCreateToast, setPendingCreateToast] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [projectPaletteOpen, setProjectPaletteOpen] = useState(false);
  const [commandLauncherOpen, setCommandLauncherOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const keySequenceRef = useRef<string[]>([]);
  const pendingCloseSequenceRef = useRef(false);
  const keySequenceTimeoutRef = useRef<number | null>(null);
  const itemMutationVersionRef = useRef(0);
  const projectMutationVersionRef = useRef(0);

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
  const pendingTheme = themes.find((theme) => theme.id === pendingThemeId) ?? themes[0];
  const accentOptions = Object.entries(pendingTheme.colors).map(([token, color]) => ({
    id: token as ThemeColorToken,
    label: formatThemeColorName(color),
    tokenLabel: formatThemeColorToken(token as ThemeColorToken),
    color,
  }));

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

  function mutateItems(updater: (current: Item[]) => Item[]) {
    itemMutationVersionRef.current += 1;
    setItems(updater);
  }

  function clearKeySequence() {
    keySequenceRef.current = [];
    pendingCloseSequenceRef.current = false;

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
      const isTypingTarget =
        event.target instanceof HTMLElement &&
        (event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.isContentEditable);

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

      if (event.key === "Escape" && projectPaletteOpen) {
        event.preventDefault();
        setProjectPaletteOpen(false);
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
        pendingCloseSequenceRef.current &&
        event.key.toLowerCase() === "z" &&
        activeView === "tasks" &&
        selectedTaskId
      ) {
        event.preventDefault();
        setSelectedTaskId("");
        clearKeySequence();
        return;
      }

      if (
        event.ctrlKey &&
        event.key.toLowerCase() === "z" &&
        activeView === "tasks" &&
        selectedTaskId
      ) {
        event.preventDefault();
        pendingCloseSequenceRef.current = true;
        return;
      }

      if (pendingCloseSequenceRef.current) {
        pendingCloseSequenceRef.current = false;
      }

      if (
        event.key === "Escape" &&
        activeView === "goals" &&
        selectedGoalId &&
        !isTypingTarget
      ) {
        event.preventDefault();
        setSelectedGoalId("");
        clearKeySequence();
        return;
      }

      if (event.key === "Escape" && activeView === "tasks" && selectedTaskId && !isTypingTarget) {
        event.preventDefault();
        setSelectedTaskId("");
        clearKeySequence();
        return;
      }

      if (
        commandPaletteOpen ||
        projectPaletteOpen ||
        commandLauncherOpen ||
        quickCaptureOpen ||
        newGoalOpen ||
        newTaskOpen ||
        newProjectOpen ||
        settingsOpen ||
        isTypingTarget
      ) {
        return;
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

      if (normalizedKey === leaderKey) {
        event.preventDefault();
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

      if (nextSequence.join("") === listProjectsSequence.join("")) {
        event.preventDefault();
        if (projects.length > 0) {
          setProjectPaletteOpen(true);
        } else {
          setToastMessage("No projects yet.");
        }
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
    projectPaletteOpen,
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
    function handleCloseTaskPanel() {
      setSelectedTaskId("");
      clearKeySequence();
    }

    function handleCloseGoalPanel() {
      setSelectedGoalId("");
      clearKeySequence();
    }

    window.addEventListener("kenchi:close-task-panel", handleCloseTaskPanel);
    window.addEventListener("kenchi:close-goal-panel", handleCloseGoalPanel);

    return () => {
      window.removeEventListener("kenchi:close-task-panel", handleCloseTaskPanel);
      window.removeEventListener("kenchi:close-goal-panel", handleCloseGoalPanel);
    };
  }, []);

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
      setItems(defaultItems);
      setLoadedItemVaultPath("");
      return;
    }

    void loadItems(vaultPath)
      .then((loadedItems) => {
        if (!cancelled) {
          if (itemMutationVersionRef.current === initialItemMutationVersion) {
            setItems(loadedItems.length > 0 ? loadedItems : defaultItems);
          }
          setLoadedItemVaultPath(vaultPath);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems(defaultItems);
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

    mutateItems((current) => attachProjectIdsFromNames(current, projects));
  }, [projects]);

  useEffect(() => {
    let cancelled = false;

    if (!vaultPath) {
      setJournalEntry(createDefaultJournalEntry(selectedJournalDate));
      setTodayJournalEntry(createDefaultJournalEntry(todayDate));
      setLoadedJournalVaultPath("");
      setJournalSummaries(createDefaultJournalSummaries(todayDate));
      return;
    }

    void loadJournalEntry(vaultPath, selectedJournalDate)
      .then((loadedEntry) => {
        if (cancelled) {
          return;
        }

        setJournalEntry(loadedEntry ?? createDefaultJournalEntry(selectedJournalDate));
        setLoadedJournalVaultPath(vaultPath);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setJournalEntry(createDefaultJournalEntry(selectedJournalDate));
        setLoadedJournalVaultPath(vaultPath);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedJournalDate, vaultPath]);

  useEffect(() => {
    let cancelled = false;

    if (!vaultPath) {
      setTodayJournalEntry(createDefaultJournalEntry(todayDate));
      return;
    }

    if (selectedJournalDate === todayDate) {
      setTodayJournalEntry(journalEntry);
      return;
    }

    void loadJournalEntry(vaultPath, todayDate)
      .then((loadedEntry) => {
        if (!cancelled) {
          setTodayJournalEntry(loadedEntry ?? createDefaultJournalEntry(todayDate));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTodayJournalEntry(createDefaultJournalEntry(todayDate));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [journalEntry, selectedJournalDate, todayDate, vaultPath]);

  useEffect(() => {
    let cancelled = false;

    if (!vaultPath) {
      setJournalSummaries(createDefaultJournalSummaries(todayDate));
      return;
    }

    void listJournalEntries(vaultPath)
      .then((summaries) => {
        if (!cancelled) {
          setJournalSummaries(summaries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJournalSummaries([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [todayDate, vaultPath]);

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

  useEffect(() => {
    if (!vaultPath || loadedItemVaultPath !== vaultPath) {
      return;
    }

    void saveItems(vaultPath, items)
      .then(() => {
        if (pendingCreateToast) {
          setToastMessage(pendingCreateToast);
          setPendingCreateToast("");
        }
      })
      .catch(() => {
        setPendingCreateToast("");
      });
  }, [items, loadedItemVaultPath, pendingCreateToast, vaultPath]);

  useEffect(() => {
    if (!vaultPath || loadedProfileVaultPath !== vaultPath) {
      return;
    }

    void saveProfile(vaultPath, profile);
  }, [loadedProfileVaultPath, profile, vaultPath]);

  useEffect(() => {
    if (!vaultPath || loadedProjectVaultPath !== vaultPath) {
      return;
    }

    void saveProjects(vaultPath, projects)
      .then(() => {
        if (pendingCreateToast) {
          setToastMessage(pendingCreateToast);
          setPendingCreateToast("");
        }
      })
      .catch(() => {
        setPendingCreateToast("");
      });
  }, [loadedProjectVaultPath, pendingCreateToast, projects, vaultPath]);

  useEffect(() => {
    if (!vaultPath || loadedJournalVaultPath !== vaultPath) {
      return;
    }

    void saveJournalEntry(vaultPath, journalEntry)
      .then(() => listJournalEntries(vaultPath))
      .then((summaries) => {
        setJournalSummaries(summaries);
      })
      .catch(() => {
        // Keep the optimistic summary state if the save or reload fails.
      });
  }, [journalEntry, loadedJournalVaultPath, vaultPath]);

  function navigateToPage(view: ViewId) {
    setActiveView(view);
  }

  function navigateToProject(projectId: string) {
    setSelectedProjectId(projectId);
    setActiveView("projects");
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

    if (nextVaultPath) {
      try {
        const initializedVaultPath = await invoke<string>("initialize_vault", {
          path: nextVaultPath,
        });

        setVaultPath(initializedVaultPath);
        window.localStorage.setItem(vaultPathStorageKey, initializedVaultPath);
      } catch (error) {
        setVaultError(
          error instanceof Error ? error.message : "Failed to initialize vault path.",
        );
        return;
      }
    } else {
      setVaultPath("");
      window.localStorage.removeItem(vaultPathStorageKey);
    }

    setProfile({
      name: pendingProfileName.trim() || defaultProfile.name,
      profilePicture: pendingProfilePicture,
    });
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
    navigateToPage(item.id as ViewId);
    setCommandPaletteOpen(false);
  }

  function handleSelectProject(item: CommandPaletteItem) {
    navigateToProject(item.id);
    setProjectPaletteOpen(false);
  }

  function handleCaptureThought(value: string) {
    const text = value.trim();

    if (!text || !vaultPath) {
      return;
    }

    mutateItems((current) => [
      {
        id: `item-${Date.now()}`,
        kind: "capture",
        state: "inbox",
        sourceType: "capture",
        title: text,
        content: text,
        createdAt: "Just now",
        updatedAt: "Just now",
        tags: [],
        project: "",
        taskStatus: "inbox",
        priority: "",
        dueDate: "",
        completedAt: "",
        estimate: "",
        goalMetric: "tasks_completed",
        goalTarget: 1,
        goalProgress: 0,
        goalProgressByDate: {},
        goalPeriod: "weekly",
        goalTrackingMode: "automatic",
      },
      ...current,
    ]);
    setPendingCreateToast("Inbox item saved to vault.");
    setQuickCaptureOpen(false);
  }

  function handleCreateTask(task: { title: string; description: string; projectId: string }) {
    const nextTask: Item = {
      id: `item-${Date.now()}`,
      kind: "task",
      state: "active",
      sourceType: "manual",
      title: task.title,
      content: task.description,
      createdAt: "just now",
      updatedAt: "just now",
      tags: [],
      projectId: task.projectId || undefined,
      project: getProjectName(projects, task.projectId, ""),
      taskStatus: "inbox",
      priority: "",
      dueDate: "",
      completedAt: "",
      estimate: "",
      goalMetric: "tasks_completed",
      goalTarget: 1,
      goalProgress: 0,
      goalProgressByDate: {},
      goalPeriod: "weekly",
      goalTrackingMode: "automatic",
    };

    mutateItems((current) => [nextTask, ...current]);
    setPendingCreateToast("Task saved to vault.");
    setSelectedTaskId(nextTask.id);
    setNewTaskOpen(false);
    setActiveView("tasks");
  }

  function handleCreateGoal(goal: {
    title: string;
    description: string;
    target: number;
    period: Item["goalPeriod"];
    trackingMode: Item["goalTrackingMode"];
    metric: Item["goalMetric"];
    projectId: string;
  }) {
    const nextGoal: Item = {
      id: `item-${Date.now()}`,
      kind: "goal",
      state: "active",
      sourceType: "manual",
      title: goal.title,
      content: goal.description,
      createdAt: "just now",
      updatedAt: "just now",
      tags: [],
      project: "",
      taskStatus: "inbox",
      priority: "",
      dueDate: "",
      completedAt: "",
      estimate: "",
      goalMetric: goal.metric,
      goalTarget: goal.target,
      goalProgress: 0,
      goalProgressByDate: {},
      goalPeriod: goal.period,
      goalTrackingMode: goal.trackingMode,
      goalScope: goal.projectId ? { projectId: goal.projectId } : undefined,
    };

    mutateItems((current) => [nextGoal, ...current]);
    setPendingCreateToast("Goal saved to vault.");
    setSelectedGoalId(nextGoal.id);
    setNewGoalOpen(false);
    setActiveView("goals");
  }

  function handleCreateProject(project: { name: string; description: string }) {
    const timestamp = new Date().toISOString();
    const nextProject: Project = {
      id: `project-${Date.now()}`,
      name: project.name,
      description: project.description,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    projectMutationVersionRef.current += 1;
    setProjects((current) => [nextProject, ...current]);
    setPendingCreateToast("Project saved to vault.");
    setSelectedProjectId(nextProject.id);
    setNewProjectOpen(false);
    setActiveView("projects");
  }

  function handleUpdateProject(projectId: string, updates: Partial<Project>) {
    projectMutationVersionRef.current += 1;

    setProjects((current) => {
      const existingProject = current.find((project) => project.id === projectId);

      if (!existingProject) {
        return current;
      }

      const nextName = typeof updates.name === "string" ? updates.name.trim() : existingProject.name;
      const nextDescription =
        typeof updates.description === "string"
          ? updates.description.trim()
          : existingProject.description;
      const timestamp = new Date().toISOString();

      if (
        nextName === existingProject.name &&
        nextDescription === existingProject.description
      ) {
        return current;
      }

      return current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              name: nextName,
              description: nextDescription,
              updatedAt: timestamp,
            }
          : project,
      );
    });
  }

  function handleDeleteProject(projectId: string) {
    projectMutationVersionRef.current += 1;
    setProjects((current) => current.filter((project) => project.id !== projectId));
    mutateItems((current) => clearProjectReferences(current, projectId));
    setSelectedProjectId((current) => (current === projectId ? "" : current));
  }

  function handleUpdateTask(taskId: string, updates: Partial<Item>) {
    mutateItems((current) =>
      current.map((item) =>
        item.id === taskId
          ? {
              ...item,
              ...updates,
              completedAt:
                updates.taskStatus === "done"
                  ? todayDate
                  : typeof updates.taskStatus !== "undefined"
                    ? ""
                    : item.completedAt,
              updatedAt: "just now",
            }
          : item,
      ),
    );
  }

  function handleUpdateGoal(goalId: string, updates: Partial<Item>) {
    mutateItems((current) =>
      current.map((item) =>
        item.id === goalId
          ? {
              ...item,
              ...updates,
              tags:
                typeof updates.tags !== "undefined"
                  ? updates.tags
                  : item.tags,
              updatedAt: "just now",
            }
          : item,
      ),
    );
  }

  function handleUpdateJournalEntry(updates: Partial<JournalEntry>) {
    const updatedAt = new Date().toISOString();

    setJournalEntry((current) => {
      const nextEntry = applyJournalEntryUpdates(current, updates, updatedAt);
      setJournalSummaries((currentSummaries) => upsertJournalSummary(currentSummaries, nextEntry));
      return nextEntry;
    });
  }

  function handleTransformItem(itemId: string, kind: Item["kind"]) {
    mutateItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              kind,
              state: kind === "document" || kind === "capture" ? "inbox" : "active",
              sourceType: item.sourceType === "capture" ? "capture" : item.sourceType,
              taskStatus: kind === "task" ? "inbox" : item.taskStatus,
              updatedAt: "just now",
            }
          : item,
      ),
    );

    if (kind === "task") {
      setSelectedTaskId(itemId);
      setActiveView("tasks");
    }

    if (kind === "goal") {
      setSelectedGoalId(itemId);
      setActiveView("goals");
    }
  }

  function handleUpdateItemState(itemId: string, state: Item["state"]) {
    mutateItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, state, updatedAt: "just now" } : item,
      ),
    );
  }

  function handleDeleteItem(itemId: string) {
    mutateItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedTaskId((current) => (current === itemId ? "" : current));
    setSelectedGoalId((current) => (current === itemId ? "" : current));
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
                  &apos;s Kenchi
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
                    onClick={() => navigateToPage(item.id)}
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
              journalSummaries={journalSummaries}
              selectedJournalDate={selectedJournalDate}
              journalEntry={journalEntry}
              todayJournalEntry={todayJournalEntry}
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedGoalId={selectedGoalId}
              selectedTaskId={selectedTaskId}
              onSelectProject={setSelectedProjectId}
              onSelectGoal={setSelectedGoalId}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteItem}
              onSelectTask={setSelectedTaskId}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteItem}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onUpdateJournalEntry={handleUpdateJournalEntry}
              onSelectJournalDate={setSelectedJournalDate}
              onTransformItem={handleTransformItem}
              onUpdateItemState={handleUpdateItemState}
              onDeleteItem={handleDeleteItem}
              onNotify={setToastMessage}
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
        title="Projects"
        placeholder="list projects"
        items={projectItems}
        isOpen={projectPaletteOpen}
        emptyMessage="No projects match that query."
        onClose={() => setProjectPaletteOpen(false)}
        onSelect={handleSelectProject}
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
        onClose={() => setNewTaskOpen(false)}
        projects={projects}
        onSubmit={handleCreateTask}
      />

      <NewGoalModal
        isOpen={newGoalOpen}
        onClose={() => setNewGoalOpen(false)}
        projects={projects}
        onSubmit={handleCreateGoal}
      />

      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
}
