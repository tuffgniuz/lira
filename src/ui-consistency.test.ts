import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import goalsPageSource from "./pages/goals/goals-page.tsx?raw";
import inboxPageSource from "./pages/inbox/capture-inbox-page.tsx?raw";
import journalingPageSource from "./pages/journaling/journaling-page.tsx?raw";
import newProjectModalSource from "./components/actions/new-project-modal/new-project-modal.tsx?raw";
import quickCaptureModalSource from "./components/actions/quick-capture-modal/quick-capture-modal.tsx?raw";
import projectsPageSource from "./pages/projects/projects-page.tsx?raw";
import settingsModalSource from "./components/actions/settings-modal/settings-modal.tsx?raw";
import newTaskModalSource from "./components/actions/new-task-modal/new-task-modal.tsx?raw";
import tasksPageSource from "./pages/tasks/tasks-page.tsx?raw";

const appCss = readFileSync("src/styles/globals.css", "utf8");

function getCssBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = appCss.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));

  expect(match?.[1]).toBeDefined();

  return match?.[1] ?? "";
}

describe("ui consistency", () => {
  it("uses neutral theme surface tokens for simplified goal modal fields", () => {
    const goalSentenceInput = getCssBlock(".new-goal__sentence-input");
    const goalChoice = getCssBlock(".new-goal__choice");
    const projectChoice = getCssBlock(".new-goal__project-choice");
    const newGoalModal = getCssBlock(".ui-modal.new-goal");

    expect(goalSentenceInput).toContain("background: var(--color-surface-elevated);");
    expect(goalSentenceInput).not.toContain("color-mix(");
    expect(goalChoice).toContain("background: var(--color-surface-elevated);");
    expect(projectChoice).toContain("overflow: hidden;");
    expect(newGoalModal).toContain("background: var(--color-main-bg);");
  });

  it("uses restrained active states for simplified goal choices", () => {
    const goalChoiceHover = getCssBlock(".new-goal__choice:hover");
    const goalChoiceActive = getCssBlock(".new-goal__choice.is-active");

    expect(goalChoiceHover).toContain("background: var(--color-surface-elevated-hover);");
    expect(goalChoiceActive).toContain("background: var(--color-surface-elevated-hover);");
    expect(goalChoiceActive).toContain("color: var(--color-accent);");
    expect(goalChoiceActive).not.toContain("color-mix(");
  });

  it("keeps project choices styled as the same flat buttons as other goal choices", () => {
    const projectChoice = getCssBlock(".new-goal__project-choice");

    expect(projectChoice).toContain("overflow: hidden;");
    expect(projectChoice).toContain("text-overflow: ellipsis;");
    expect(projectChoice).toContain("white-space: nowrap;");
  });

  it("keeps shared empty states centered and background-free", () => {
    const emptyState = getCssBlock(".ui-empty-state");
    const emptyStateIllustration = getCssBlock(".ui-empty-state__illustration");

    expect(emptyState).toContain("align-items: center;");
    expect(emptyState).toContain("justify-content: center;");
    expect(emptyState).toContain("background: transparent;");
    expect(emptyStateIllustration).toContain("color: var(--color-accent);");
  });

  it("lets modal-owned custom menus extend beyond the dialog body", () => {
    const uiModal = getCssBlock(".ui-modal");

    expect(uiModal).toContain("overflow: visible;");
  });

  it("uses the app background for shared floating windows and elevated surfaces for palette inputs", () => {
    const floatingPanel = getCssBlock(".floating-panel");
    const paletteInput = getCssBlock(".palette-input");

    expect(floatingPanel).toContain("background: var(--color-main-bg);");
    expect(paletteInput).toContain("background: var(--color-surface-elevated);");
  });

  it("gives floating creation modals roomier internal padding", () => {
    const quickCaptureForm = getCssBlock(".quick-capture__form");
    const newTaskForm = getCssBlock(".new-task__form");
    const newGoalForm = getCssBlock(".new-goal__form");

    expect(quickCaptureForm).toContain("padding: 1.25rem;");
    expect(newTaskForm).toContain("padding: 1.25rem;");
    expect(newGoalForm).toContain("padding: 1.35rem 1.35rem 1.2rem;");
  });

  it("uses shared modal field classes across simple creation modals", () => {
    expect(newProjectModalSource).toContain('className="modal-form__input ui-input"');
    expect(newProjectModalSource).toContain('className="modal-form__textarea ui-input"');
    expect(newTaskModalSource).toContain('className="modal-form__input ui-input"');
    expect(newTaskModalSource).toContain('className="modal-form__textarea ui-input"');
    expect(quickCaptureModalSource).toContain('className="modal-form__input ui-input"');
  });

  it("uses lighter elevated surfaces for shared modal fields", () => {
    const modalFieldControls = getCssBlock(
      ".modal-form__input,\n.modal-form__textarea,\n.modal-form__select",
    );
    const modalFieldFocus = getCssBlock(
      ".modal-form__input:focus,\n.modal-form__textarea:focus,\n.modal-form__select:focus",
    );

    expect(modalFieldControls).toContain("background: var(--color-surface-elevated);");
    expect(modalFieldFocus).toContain("background: var(--color-surface-elevated-hover);");
  });

  it("keeps shared active panels on neutral elevated surfaces", () => {
    const panelActive = getCssBlock(".ui-panel.is-active");

    expect(panelActive).toContain("background: var(--color-surface-elevated-hover);");
    expect(panelActive).not.toContain("color-mix(");
  });

  it("keeps manual goal progress controls visibly clickable when unchecked", () => {
    const goalCheckbox = getCssBlock(".goal-card__checkbox");
    const goalCheckboxMark = getCssBlock(".goal-card__checkbox-mark");
    const linkedTask = getCssBlock(".goal-card__linked-task");
    const linkedTaskInput = getCssBlock(".goal-card__linked-task input");

    expect(goalCheckbox).toContain("padding: 0.2rem;");
    expect(goalCheckboxMark).toContain("display: inline-block;");
    expect(linkedTask).toContain("background: transparent;");
    expect(linkedTaskInput).toContain("appearance: none;");
    expect(linkedTaskInput).toContain("border: 1px solid var(--color-accent);");
    expect(linkedTaskInput).toContain("border-radius: 999px;");
  });

  it("truncates long goal card text instead of wrapping the card layout", () => {
    const goalHeader = getCssBlock(".goal-card__header");
    const goalTitle = getCssBlock(".goal-card__title");
    const goalMeta = getCssBlock(".goal-card__meta");
    const linkedTaskTitle = getCssBlock(".goal-card__linked-task-title");

    expect(goalHeader).toContain("min-width: 0;");
    expect(goalTitle).toContain("overflow: hidden;");
    expect(goalTitle).toContain("text-overflow: ellipsis;");
    expect(goalTitle).toContain("white-space: nowrap;");
    expect(goalMeta).toContain("overflow: hidden;");
    expect(goalMeta).toContain("text-overflow: ellipsis;");
    expect(goalMeta).toContain("white-space: nowrap;");
    expect(linkedTaskTitle).toContain("overflow: hidden;");
    expect(linkedTaskTitle).toContain("text-overflow: ellipsis;");
    expect(linkedTaskTitle).toContain("white-space: nowrap;");
  });

  it("keeps left-rail active backgrounds inside a right gutter", () => {
    const journalList = getCssBlock(".journal-nav__list");
    const goalsList = getCssBlock(".goals-rail__list");

    expect(journalList).toContain("padding-right: 0.5rem;");
    expect(goalsList).toContain("padding-right: 0.5rem;");

    expect(journalList).not.toMatch(/margin-right:\s*-/);
    expect(goalsList).not.toMatch(/margin-right:\s*-/);
  });

  it("lets project board lanes stretch to the full page height", () => {
    const projectsBoardMain = getCssBlock(".projects-board-main");
    const projectsBoard = getCssBlock(".projects-board");
    const projectsBoardLane = getCssBlock(".projects-board-lane");

    expect(projectsBoardMain).toContain("flex: 1;");
    expect(projectsBoard).toContain("flex: 1;");
    expect(projectsBoard).toContain("grid-auto-rows: minmax(0, 1fr);");
    expect(projectsBoard).toContain("gap: 2.25rem;");
    expect(projectsBoardLane).toContain("height: 100%;");
    expect(projectsBoardLane).toContain("background: transparent;");
  });

  it("keeps equal breathing room above and below the project board title", () => {
    const projectsBoardHeaderTitle = getCssBlock(".projects-board-header__title");
    const projectsBoardHeaderCopy = getCssBlock(".projects-board-header__copy");
    const projectsBoardLane = getCssBlock(".projects-board-lane");

    expect(projectsBoardHeaderTitle).toContain("margin-top: 0.9rem;");
    expect(projectsBoardHeaderCopy).toContain("margin-top: 0.9rem;");
    expect(projectsBoardLane).toContain("padding: 0.9rem 0 0;");
  });

  it("shows project board focus through the heading dot and the focused task card instead of the lane shell", () => {
    const projectsBoardLane = getCssBlock(".projects-board-lane");
    const focusedProjectLaneOutline = getCssBlock(".projects-board-lane:focus-visible");
    const projectsBoardCard = getCssBlock(".projects-board-card");
    const focusedProjectBoardCard = getCssBlock(".projects-board-card.is-focused");
    const focusDot = getCssBlock(".projects-board-lane__focus-dot");
    const cardTimestamp = getCssBlock(".projects-board-card__timestamp");

    expect(projectsBoardLane).not.toContain("border:");
    expect(projectsBoardLane).toContain("background: transparent;");
    expect(focusedProjectLaneOutline).toContain("outline: none;");
    expect(projectsBoardCard).toContain("background: var(--color-surface-elevated);");
    expect(focusedProjectBoardCard).toContain("border: 2px solid var(--color-active-bg);");
    expect(focusDot).toContain("background: var(--color-accent);");
    expect(cardTimestamp).toContain("font-size: 0.62rem;");
    expect(cardTimestamp).toContain("font-weight: 400;");
    expect(cardTimestamp).toContain("margin-bottom: 0.2rem;");
  });

  it("suppresses browser focus outlines on custom active controls that already have their own focus styling", () => {
    const navButtonFocus = getCssBlock(".nav-button:focus-visible");
    const tasksFilterFocus = getCssBlock(".tasks-filter:focus-visible");
    const settingsNavButtonFocus = getCssBlock(".settings-nav__button:focus-visible");
    const themeCardFocus = getCssBlock(".theme-card:focus-visible");
    const newTaskChoiceFocus = getCssBlock(".new-task__project-choice:focus-visible");
    const newGoalChoiceFocus = getCssBlock(".new-goal__choice:focus-visible");

    expect(navButtonFocus).toContain("outline: none;");
    expect(tasksFilterFocus).toContain("outline: none;");
    expect(settingsNavButtonFocus).toContain("outline: none;");
    expect(themeCardFocus).toContain("outline: none;");
    expect(newTaskChoiceFocus).toContain("outline: none;");
    expect(newGoalChoiceFocus).toContain("outline: none;");
  });

  it("does not use ad hoc inline border or shadow styles in feature components", () => {
    const sources = [
      tasksPageSource,
      projectsPageSource,
      goalsPageSource,
      inboxPageSource,
      journalingPageSource,
      settingsModalSource,
    ]
      .join("\n");

    expect(sources).not.toMatch(/border[A-Z][A-Za-z]+\s*:/);
    expect(sources).not.toMatch(/boxShadow\s*:/);
  });
});
