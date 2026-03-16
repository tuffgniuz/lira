import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ColumnsIcon, FocusModeIcon, SettingsIcon } from "../../app/icons";
import { FloatingPanel } from "../../components/floating-panel";
import { RightRailColumn } from "../../components/right-rail-column";
import { ThreeColumnLayout } from "../../components/three-column-layout";
import type { Item } from "../../models/item";
import type { JournalEntrySummary } from "../../models/journal";
import type { Project } from "../../models/project";

export function ProjectsPage({
  projects,
  items,
  journalSummaries,
  todayDate,
  selectedProjectId,
  onSelectProject,
  onUpdateProject,
  onDeleteProject,
}: {
  projects: Project[];
  items: Item[];
  journalSummaries: JournalEntrySummary[];
  todayDate: string;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
}) {
  const [layoutMode, setLayoutMode] = useState<"columns" | "full">("full");
  const [detailMode, setDetailMode] = useState<"overview" | "settings">("overview");
  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState("");

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;
  const isExpandedLayout = layoutMode === "full" || detailMode === "settings";

  useEffect(() => {
    if (detailMode === "settings") {
      setLayoutMode("full");
    }
  }, [detailMode]);

  useEffect(() => {
    if (!selectedProject) {
      setDetailMode("overview");
      setDeleteConfirmOpen(false);
      setDeleteConfirmationValue("");
      return;
    }

    setNameDraft(selectedProject.name);
    setDescriptionDraft(selectedProject.description);
    setDeleteConfirmationValue("");
  }, [selectedProject]);

  const projectListMeta = useMemo(() => {
    return new Map(
      projects.map((project) => {
        const projectTasks = items.filter(
          (item) =>
            item.kind === "task" &&
            item.projectId === project.id &&
            item.state !== "deleted",
        );

        return [
          project.id,
          {
            taskCount: projectTasks.length,
            activityLabel: getProjectActivityLabel(project),
          },
        ];
      }),
    );
  }, [items, projects]);

  return (
    <section className="page page--projects" aria-label="Projects">
      {projects.length > 0 && selectedProject ? (
        <ThreeColumnLayout
          className={`projects-layout ${isExpandedLayout ? "is-full-width" : ""}`}
          leftClassName="projects-rail"
          centerClassName="projects-detail"
          rightClassName="projects-context"
          centerOnly={isExpandedLayout}
          leftLabel="Projects list"
          centerLabel="Project details"
          rightLabel="Project stats"
          left={
            <ProjectRailList
              projects={projects}
              selectedProjectId={selectedProject.id}
              projectListMeta={projectListMeta}
              onSelectProject={onSelectProject}
            />
          }
          center={
            <>
              {detailMode === "settings" ? (
                <header className="projects-detail__header projects-detail__header--settings">
                  <h1 className="projects-detail__title">Settings</h1>
                </header>
              ) : (
                <>
                  <header className="projects-detail__header">
                    <p className="page__eyebrow">Project</p>
                    <h1 className="projects-detail__title">{selectedProject.name}</h1>
                  </header>
                  <p className="projects-detail__description">
                    {selectedProject.description || "No description yet."}
                  </p>
                </>
              )}
              {detailMode === "settings" ? (
                <section
                  className="projects-settings projects-settings--centered"
                  aria-label="Project settings"
                >
                  <button
                    type="button"
                    className="projects-detail__icon-button projects-detail__icon-button--back"
                    aria-label="Back to project overview"
                    onClick={() => setDetailMode("overview")}
                  >
                    <ArrowLeftIcon className="projects-detail__layout-toggle-icon" />
                  </button>
                  <label className="projects-settings__field">
                    <span className="projects-settings__label">Name</span>
                    <input
                      className="projects-settings__input"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                    />
                  </label>
                  <label className="projects-settings__field">
                    <span className="projects-settings__label">Description</span>
                    <textarea
                      className="projects-settings__textarea"
                      value={descriptionDraft}
                      onChange={(event) => setDescriptionDraft(event.target.value)}
                    />
                  </label>
                  <div className="projects-settings__actions">
                    <button
                      type="button"
                      className="projects-settings__button"
                      onClick={() =>
                        onUpdateProject(selectedProject.id, {
                          name: nameDraft,
                          description: descriptionDraft,
                        })
                      }
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="projects-settings__button projects-settings__button--danger"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      Remove project
                    </button>
                  </div>
                </section>
              ) : (
                <div className="projects-detail__actions">
                  <button
                    type="button"
                    className="projects-detail__icon-button"
                    aria-label="Show project settings"
                    onClick={() => setDetailMode("settings")}
                  >
                    <SettingsIcon className="projects-detail__layout-toggle-icon" />
                  </button>
                  <button
                    type="button"
                    className="projects-detail__icon-button"
                    aria-label={
                      layoutMode === "columns"
                        ? "Show project detail in full width"
                        : "Show project detail in three-column layout"
                    }
                    onClick={() =>
                      setLayoutMode((current) => (current === "columns" ? "full" : "columns"))
                    }
                  >
                    {layoutMode === "columns" ? (
                      <FocusModeIcon className="projects-detail__layout-toggle-icon" />
                    ) : (
                      <ColumnsIcon className="projects-detail__layout-toggle-icon" />
                    )}
                  </button>
                </div>
              )}
            </>
          }
          right={
            <RightRailColumn items={items} journalSummaries={journalSummaries} todayDate={todayDate} />
          }
        />
      ) : (
        <div className="projects-empty">
          <div className="projects-empty__art" aria-hidden="true">
            <svg viewBox="0 0 180 180" className="projects-empty__svg">
              <defs>
                <linearGradient id="projects-empty-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--color-focus-ring)" stopOpacity="0.75" />
                </linearGradient>
              </defs>
              <circle
                cx="90"
                cy="90"
                r="68"
                fill="url(#projects-empty-gradient)"
                opacity="0.12"
              />
              <rect
                x="48"
                y="58"
                width="84"
                height="64"
                rx="12"
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth="4"
              />
              <path
                d="M48 78h84"
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth="4"
              />
              <path
                d="M68 46h24c4.4 0 8 3.6 8 8v4H60v-4c0-4.4 3.6-8 8-8Z"
                fill="none"
                stroke="var(--color-text-secondary)"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M66 94h20M66 108h48"
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="132" cy="56" r="12" fill="var(--color-panel-bg)" />
              <path
                d="M132 50v12M126 56h12"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="projects-empty__title">No projects yet</p>
          <p className="projects-empty__copy">Use `Space n p` to create your first project.</p>
        </div>
      )}
      {selectedProject && deleteConfirmOpen ? (
        <FloatingPanel
          ariaLabelledBy="delete-project-title"
          className="confirm-panel"
          onClose={() => {
            setDeleteConfirmOpen(false);
            setDeleteConfirmationValue("");
          }}
        >
          <div className="confirm-panel__content">
            <p id="delete-project-title" className="confirm-panel__title">
              Remove project
            </p>
            <p className="confirm-panel__copy">
              Type <strong>{selectedProject.name}</strong> to confirm permanent deletion.
            </p>
            <input
              className="confirm-panel__input"
              value={deleteConfirmationValue}
              onChange={(event) => setDeleteConfirmationValue(event.target.value)}
              placeholder={selectedProject.name}
              autoFocus
            />
            <div className="confirm-panel__actions">
              <button
                type="button"
                className="confirm-panel__button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmationValue("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-panel__button confirm-panel__button--danger"
                disabled={deleteConfirmationValue !== selectedProject.name}
                onClick={() => {
                  onDeleteProject(selectedProject.id);
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmationValue("");
                  setDetailMode("overview");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </FloatingPanel>
      ) : null}
    </section>
  );
}

function ProjectRailList({
  projects,
  selectedProjectId,
  projectListMeta,
  onSelectProject,
}: {
  projects: Project[];
  selectedProjectId: string;
  projectListMeta: Map<string, { taskCount: number; activityLabel: string }>;
  onSelectProject: (projectId: string) => void;
}) {
  return (
    <>
      <div className="projects-rail__header">
        <p className="page__eyebrow">Projects</p>
      </div>
      <div className="projects-rail__list">
        {projects.map((project) => {
          const meta = projectListMeta.get(project.id) ?? {
            taskCount: 0,
            activityLabel: "created just now",
          };

          return (
            <button
              key={project.id}
              type="button"
              className={`projects-rail__item ${selectedProjectId === project.id ? "is-active" : ""}`}
              onClick={() => onSelectProject(project.id)}
            >
              <span className="projects-rail__name">{project.name}</span>
              <span className="projects-rail__description">
                {formatTaskCount(meta.taskCount)} - {meta.activityLabel}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function formatTaskCount(count: number) {
  return `${count} ${count === 1 ? "task" : "tasks"}`;
}

function getProjectActivityLabel(project: Project) {
  const hasUpdate = project.updatedAt && project.updatedAt !== project.createdAt;

  if (hasUpdate) {
    return `updated ${formatRelativeTimestamp(project.updatedAt)}`;
  }

  return `created ${formatRelativeTimestamp(project.createdAt)}`;
}

function formatRelativeTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(diffInSeconds) >= secondsPerUnit || unit === "second") {
      const delta = Math.round(diffInSeconds / secondsPerUnit);
      return rtf.format(delta, unit);
    }
  }

  return value;
}
