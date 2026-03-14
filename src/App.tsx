import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { CommandPalette } from "./components/CommandPalette";
import type { CommandPaletteItem } from "./components/CommandPalette";
import { FloatingPanel } from "./components/FloatingPanel";
import { saveInboxItems, loadInboxItems } from "./lib/storage/inbox";
import type { CaptureItem } from "./models/capture";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import "./App.css";

type ViewId =
  | "dashboard"
  | "inbox"
  | "goals"
  | "tasks"
  | "projects"
  | "journaling"
  | "calendar";

type NavItem = {
  id: ViewId;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
};

const navigationItems: NavItem[] = [
  { id: "inbox", label: "Capture Inbox", icon: InboxIcon },
  { id: "goals", label: "Goals", icon: TargetIcon },
  { id: "tasks", label: "Tasks", icon: CheckSquareIcon },
  { id: "projects", label: "Projects", icon: LayersIcon },
  { id: "journaling", label: "Journaling", icon: BookOpenIcon },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
];

const noteItems = [
  "Product Vision",
  "Inbox Processing Rules",
  "Writing Rituals",
  "Project Kenchi",
  "Quarterly Review",
];

const profileName = "User";
const pageSequence = ["g", "t", "p"];
const quickCaptureSequence = ["q", "c"];
const vaultPathStorageKey = "kenchi.vault-path";

const viewTitles: Record<ViewId, string> = {
  dashboard: "Dashboard",
  inbox: "Capture Inbox",
  goals: "Goals",
  tasks: "Tasks",
  projects: "Projects",
  journaling: "Journaling",
  calendar: "Calendar",
};

function App() {
  return (
    <ThemeProvider>
      <KenchiShell />
    </ThemeProvider>
  );
}

function KenchiShell() {
  const { activeThemeId, themes, previewTheme, applyThemeSelection, resetPreview } =
    useTheme();
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"theme" | "vault">("theme");
  const [pendingThemeId, setPendingThemeId] = useState(activeThemeId);
  const [vaultPath, setVaultPath] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(vaultPathStorageKey) ?? "";
  });
  const [pendingVaultPath, setPendingVaultPath] = useState(vaultPath);
  const [vaultError, setVaultError] = useState("");
  const [inboxEntries, setInboxEntries] = useState<CaptureItem[]>([]);
  const [loadedVaultPath, setLoadedVaultPath] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandLauncherOpen, setCommandLauncherOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);

  const pageItems: CommandPaletteItem[] = navigationItems.map((item) => ({
    id: item.id,
    label: item.label,
    keywords: [item.id.replace("_", " "), item.label.toLowerCase()],
    icon: <item.icon className="nav-icon" />,
  }));

  const commandItems: CommandPaletteItem[] = [
    {
      id: "go-to-page",
      label: "Go to page",
      keywords: ["gtp", "navigate", "page"],
      icon: <ArrowTurnIcon className="nav-icon" />,
    },
    {
      id: "quick-capture",
      label: "Quick capture",
      keywords: ["qc", "capture", "inbox"],
      icon: <SparkIcon className="nav-icon" />,
    },
    {
      id: "settings",
      label: "Settings",
      keywords: ["preferences", "theme", "config"],
      icon: <SettingsIcon className="nav-icon" />,
    },
  ];

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
        setKeySequence([]);
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
        setKeySequence([]);
        return;
      }

      if (event.key === "Escape" && commandLauncherOpen) {
        event.preventDefault();
        setCommandLauncherOpen(false);
        setKeySequence([]);
        return;
      }

      if (event.key === "Escape" && quickCaptureOpen) {
        event.preventDefault();
        setQuickCaptureOpen(false);
        setKeySequence([]);
        return;
      }

      if (
        commandPaletteOpen ||
        commandLauncherOpen ||
        quickCaptureOpen ||
        settingsOpen ||
        isTypingTarget
      ) {
        return;
      }

      if (event.key === ":") {
        event.preventDefault();
        setCommandLauncherOpen(true);
        setKeySequence([]);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        setKeySequence([]);
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const nextSequence = [...keySequence, event.key.toLowerCase()].slice(-3);
      setKeySequence(nextSequence);

      if (nextSequence.join("") === pageSequence.join("")) {
        event.preventDefault();
        setCommandPaletteOpen(true);
        setKeySequence([]);
        return;
      }

      if (nextSequence.join("") === quickCaptureSequence.join("")) {
        event.preventDefault();
        setQuickCaptureOpen(true);
        setKeySequence([]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    commandLauncherOpen,
    commandPaletteOpen,
    keySequence,
    quickCaptureOpen,
    settingsOpen,
    activeThemeId,
  ]);

  useEffect(() => {
    if (!settingsOpen) {
      setPendingThemeId(activeThemeId);
      setPendingVaultPath(vaultPath);
    }
  }, [activeThemeId, settingsOpen, vaultPath]);

  useEffect(() => {
    let cancelled = false;

    if (!vaultPath) {
      setInboxEntries([]);
      setLoadedVaultPath("");
      return;
    }

    void loadInboxItems(vaultPath)
      .then((items) => {
        if (cancelled) {
          return;
        }

        setInboxEntries(items);
        setLoadedVaultPath(vaultPath);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setInboxEntries([]);
        setLoadedVaultPath(vaultPath);
      });

    return () => {
      cancelled = true;
    };
  }, [vaultPath]);

  useEffect(() => {
    if (!vaultPath || loadedVaultPath !== vaultPath) {
      return;
    }

    void saveInboxItems(vaultPath, inboxEntries);
  }, [inboxEntries, loadedVaultPath, vaultPath]);

  function openSettings() {
    setPendingThemeId(activeThemeId);
    setPendingVaultPath(vaultPath);
    setVaultError("");
    setSettingsOpen(true);
  }

  function closeSettings() {
    resetPreview();
    setPendingThemeId(activeThemeId);
    setPendingVaultPath(vaultPath);
    setVaultError("");
    setSettingsOpen(false);
  }

  function handleThemePreview(themeId: string) {
    setPendingThemeId(themeId);
    previewTheme(themeId);
  }

  async function handleConfirmSettings() {
    applyThemeSelection(pendingThemeId);
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
    setActiveView(item.id as ViewId);
    setCommandPaletteOpen(false);
  }

  function handleCaptureThought(value: string) {
    const text = value.trim();

    if (!text || !vaultPath) {
      return;
    }

    setInboxEntries((current) => [
      {
        id: `capture-${Date.now()}`,
        text,
        createdAt: "Just now",
        tags: [],
        project: null,
      },
      ...current,
    ]);
    setQuickCaptureOpen(false);
  }

  function handleSelectCommand(item: CommandPaletteItem) {
    setCommandLauncherOpen(false);

    if (item.id === "go-to-page") {
      setCommandPaletteOpen(true);
      return;
    }

    if (item.id === "quick-capture") {
      setQuickCaptureOpen(true);
      return;
    }

    if (item.id === "settings") {
      openSettings();
    }
  }

  return (
    <>
      <div className="app-shell">
        <aside
          className={`sidebar ${sidebarExpanded ? "is-expanded" : "is-collapsed"}`}
        >
        <div className="sidebar__header">
          {sidebarExpanded ? (
            <button
              type="button"
              className="sidebar__brand"
              onClick={() => setActiveView("dashboard")}
              aria-label="Open dashboard"
            >
              <span className="sidebar__avatar" aria-hidden="true">
                {profileName.slice(0, 1)}
              </span>
              <span className="sidebar__brand-copy">
                <span className="sidebar__brand-name">{profileName}&apos;s Kenchi</span>
              </span>
            </button>
          ) : null}

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
                  className={`nav-button ${
                    activeView === item.id ? "is-active" : ""
                  }`}
                  onClick={() => setActiveView(item.id)}
                  aria-label={item.label}
                  title={sidebarExpanded ? undefined : item.label}
                >
                  <Icon className="nav-icon" />
                  {sidebarExpanded ? <span>{item.label}</span> : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar__section sidebar__section--notes">
          {sidebarExpanded ? (
            <>
              <div className="sidebar__section-heading">
                <p className="sidebar__section-label">Notes</p>
                <button type="button" className="notes__action" aria-label="Create note">
                  <PlusIcon className="nav-icon" />
                </button>
              </div>

              <div className="notes-list" aria-label="Notes">
                {noteItems.map((note) => (
                  <button key={note} type="button" className="note-link">
                    <NoteIcon className="note-link__icon" />
                    <span>{note}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="notes__collapsed"
              aria-label="Notes are available when the sidebar is expanded"
              title="Expand sidebar to view notes"
            >
              <NoteIcon className="nav-icon" />
            </button>
          )}
        </div>

        <div className="sidebar__section sidebar__section--settings">
          <button
            type="button"
            className="nav-button"
            onClick={openSettings}
            aria-label="Settings"
            title={sidebarExpanded ? undefined : "Settings"}
          >
            <SettingsIcon className="nav-icon" />
            {sidebarExpanded ? <span>Settings</span> : null}
          </button>
        </div>
        </aside>

        <main className="main-panel">
          <div className="main-panel__content">
            <PageContent activeView={activeView} inboxItems={inboxEntries} />
          </div>
        </main>
      </div>

      {!vaultPath ? (
        <div className="app-warning" role="alert">
          No vault is configured. Set a vault in Settings before capturing or storing data.
        </div>
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          activeSection={settingsSection}
          onSectionChange={setSettingsSection}
          themes={themes}
          pendingThemeId={pendingThemeId}
          pendingVaultPath={pendingVaultPath}
          vaultError={vaultError}
          onPreviewTheme={handleThemePreview}
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
    </>
  );
}

function PageContent({
  activeView,
  inboxItems,
}: {
  activeView: ViewId;
  inboxItems: CaptureItem[];
}) {
  if (activeView === "dashboard") {
    return <section className="page page--empty" aria-label="Dashboard" />;
  }

  if (activeView === "inbox") {
    return <CaptureInboxPage inboxItems={inboxItems} />;
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

function CaptureInboxPage({ inboxItems }: { inboxItems: CaptureItem[] }) {
  return (
    <section className="page page--inbox" aria-label="Capture Inbox">
      <div className="page__header page__header--inbox">
        <div>
          <p className="page__eyebrow">Capture</p>
          <h1 className="page__title">Inbox</h1>
        </div>
        <div className="inbox-filters" aria-label="Inbox filters">
          <button type="button" className="inbox-filter inbox-filter--active">
            All
          </button>
          <button type="button" className="inbox-filter">
            Unprocessed
          </button>
          <button type="button" className="inbox-filter">
            Archived
          </button>
        </div>
      </div>

      {inboxItems.length > 0 ? (
        <div className="inbox-list" aria-label="Captured thoughts">
          {inboxItems.map((item) => (
            <article key={item.id} className="inbox-item">
              <div className="inbox-item__marker" aria-hidden="true" />
              <div className="inbox-item__body">
                <p className="inbox-item__text">{item.text}</p>
                <div className="inbox-item__meta">
                  <span>{item.createdAt}</span>
                  {item.project ? <span>{item.project}</span> : null}
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="inbox-item__actions" aria-label="Inbox item actions">
                <button type="button" className="inbox-action">
                  Task
                </button>
                <button type="button" className="inbox-action">
                  Note
                </button>
                <button type="button" className="inbox-action">
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="inbox-empty">
          <p className="inbox-empty__title">No captured thoughts yet</p>
          <p className="inbox-empty__copy">
            Use `q c` to open quick capture from anywhere in the app.
          </p>
        </div>
      )}
    </section>
  );
}

function QuickCaptureModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setValue("");
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <FloatingPanel
      ariaLabelledBy="quick-capture-title"
      className="quick-capture"
      onClose={onClose}
    >
      <form className="quick-capture__form" onSubmit={handleSubmit}>
        <p id="quick-capture-title" className="quick-capture__title">
          Quick Capture
        </p>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="quick-capture__input"
          placeholder="Capture a thought"
          aria-label="Capture a thought"
          autoFocus
        />
      </form>
    </FloatingPanel>
  );
}

type SettingsModalProps = {
  activeSection: "theme" | "vault";
  onSectionChange: (section: "theme" | "vault") => void;
  themes: Array<{
    id: string;
    label: string;
    colors: {
      sidebarSurface: string;
      panelBg: string;
      accent: string;
      textPrimary: string;
      textMuted: string;
    };
  }>;
  pendingThemeId: string;
  pendingVaultPath: string;
  vaultError: string;
  onPreviewTheme: (themeId: string) => void;
  onVaultPathChange: (path: string) => void;
  onBrowseVault: () => Promise<void>;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function SettingsModal({
  activeSection,
  onSectionChange,
  themes,
  pendingThemeId,
  pendingVaultPath,
  vaultError,
  onPreviewTheme,
  onVaultPathChange,
  onBrowseVault,
  onClose,
  onConfirm,
}: SettingsModalProps) {
  return (
    <div className="settings-modal__backdrop" role="presentation" onClick={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="settings-modal__sidebar">
          <div className="settings-modal__sidebar-top">
            <p id="settings-title" className="settings-modal__eyebrow">
              Settings
            </p>
          </div>

          <nav className="settings-nav" aria-label="Settings sections">
            <button
              type="button"
              className={`settings-nav__button ${
                activeSection === "theme" ? "is-active" : ""
              }`}
              onClick={() => onSectionChange("theme")}
            >
              <PaletteIcon className="nav-icon" />
              <span>Theme</span>
            </button>
            <button
              type="button"
              className={`settings-nav__button ${
                activeSection === "vault" ? "is-active" : ""
              }`}
              onClick={() => onSectionChange("vault")}
            >
              <FolderIcon className="nav-icon" />
              <span>Vault</span>
            </button>
          </nav>
        </aside>

        <div className="settings-modal__content">
          {activeSection === "theme" ? (
            <div className="settings-panel">
              <div className="settings-panel__header">
                <div>
                  <p className="settings-modal__eyebrow">Appearance</p>
                  <h3 className="settings-panel__title">Theme</h3>
                </div>
              </div>

              <div className="theme-grid">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-card ${
                      pendingThemeId === theme.id ? "is-selected" : ""
                    }`}
                    onClick={() => onPreviewTheme(theme.id)}
                  >
                    <div className="theme-card__preview">
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.sidebarSurface }}
                      />
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.panelBg }}
                      />
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <span
                        className="theme-card__swatch"
                        style={{ backgroundColor: theme.colors.textPrimary }}
                      />
                    </div>
                    <div className="theme-card__copy">
                      <span className="theme-card__label">{theme.label}</span>
                      <span className="theme-card__meta">{theme.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="settings-panel">
              <div className="settings-panel__header">
                <div>
                  <p className="settings-modal__eyebrow">Storage</p>
                  <h3 className="settings-panel__title">Vault</h3>
                </div>
              </div>

              <div className="vault-settings">
                <label className="vault-settings__field">
                  <span className="vault-settings__label">Vault path</span>
                  <input
                    type="text"
                    value={pendingVaultPath}
                    onChange={(event) => onVaultPathChange(event.target.value)}
                    className="vault-settings__input"
                    placeholder="/path/to/kenchi-vault"
                    aria-label="Vault path"
                  />
                </label>
                <button
                  type="button"
                  className="vault-settings__browse"
                  onClick={() => void onBrowseVault()}
                >
                  Choose directory
                </button>
                <p className="vault-settings__hint">
                  Vaults stay local-first. Choosing a synced folder later should remain
                  compatible with future sync workflows.
                </p>
                {vaultError ? <p className="vault-settings__error">{vaultError}</p> : null}
              </div>
            </div>
          )}

          <div className="settings-modal__footer">
            <button
              type="button"
              className="settings-modal__confirm"
              onClick={() => void onConfirm()}
            >
              Confirm
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function IconBase({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3" />
      <path d="M12 18.5v3" />
      <path d="M2.5 12h3" />
      <path d="M18.5 12h3" />
    </IconBase>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </IconBase>
  );
}

function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </IconBase>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m12 4 8 4.5-8 4.5-8-4.5L12 4Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 15.5 8 4.5 8-4.5" />
    </IconBase>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h11.5v16H7a2.5 2.5 0 0 0-2.5 2.5Z" />
      <path d="M7 3v18" />
      <path d="M18.5 5.5h-9" />
    </IconBase>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M7.5 3.5v3" />
      <path d="M16.5 3.5v3" />
      <path d="M3.5 9.5h17" />
      <path d="M8 13h3" />
      <path d="M13.5 13h2.5" />
      <path d="M8 17h3" />
    </IconBase>
  );
}

function BurgerIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 7.5h14" />
      <path d="M5 12h14" />
      <path d="M5 16.5h14" />
    </IconBase>
  );
}

function CollapseSidebarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3.5" y="4" width="17" height="16" rx="3" />
      <path d="M9 4v16" />
    </IconBase>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v1.75" />
      <path d="M12 17.75v1.75" />
      <path d="m6.7 6.7 1.25 1.25" />
      <path d="m16.05 16.05 1.25 1.25" />
      <path d="M4.5 12h1.75" />
      <path d="M17.75 12h1.75" />
      <path d="m6.7 17.3 1.25-1.25" />
      <path d="m16.05 7.95 1.25-1.25" />
    </IconBase>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2.5h5.5A2.5 2.5 0 0 1 20 10v6.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M4 9.5h16" />
    </IconBase>
  );
}

function ArrowTurnIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 7h10" />
      <path d="m7 7 3-3" />
      <path d="m7 7 3 3" />
      <path d="M17 7v5a5 5 0 0 1-5 5H6" />
    </IconBase>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 4.5 13.8 9l4.7 1.8-4.7 1.8L12 17l-1.8-4.4-4.7-1.8L10.2 9 12 4.5Z" />
      <path d="M18.5 4.5v3" />
      <path d="M17 6h3" />
    </IconBase>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 4.5a7.5 7.5 0 1 0 0 15h1.25a1.75 1.75 0 0 0 0-3.5H12a1.75 1.75 0 0 1 0-3.5h2.25A3.75 3.75 0 0 0 18 8.75 4.25 4.25 0 0 0 13.75 4.5Z" />
      <circle cx="7.75" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.75" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="8.25" r="0.9" fill="currentColor" stroke="none" />
    </IconBase>
  );
}


function NoteIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 3.5h7l4 4V20.5H7a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5v4h4" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h7" />
    </IconBase>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export default App;
