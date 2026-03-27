import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import goalsPageSource from "./pages/goals/goals-page.tsx?raw";
import inboxPageSource from "./pages/inbox/capture-inbox-page.tsx?raw";
import newProjectModalSource from "./components/actions/new-project-modal/new-project-modal.tsx?raw";
import quickCaptureModalSource from "./components/actions/quick-capture-modal/quick-capture-modal.tsx?raw";
import projectsPageSource from "./pages/projects/projects-page.tsx?raw";
import settingsModalSource from "./components/actions/settings-modal/settings-modal.tsx?raw";
import newTaskModalSource from "./components/actions/new-task-modal/new-task-modal.tsx?raw";
import vimEditorMarkdownSource from "./lib/codemirror/vim-editor-markdown.ts?raw";
import vimEditorSource from "./components/data-input/vim-editor/vim-editor.tsx?raw";
import tasksPageSource from "./pages/tasks/tasks-page.tsx?raw";

const appCss = readFileSync("src/styles/globals.css", "utf8");
const mainSource = readFileSync("src/main.tsx", "utf8");
const taskDetailPageSource = readFileSync("src/pages/tasks/task-detail-page.tsx", "utf8");

function getCssBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = appCss.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "m"));

  expect(match?.[1]).toBeDefined();

  return match?.[1] ?? "";
}

function getSourceBlock(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}[,} ]`, "m"));

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
    const appShell = getCssBlock(".app-shell");
    const avatarAnchor = getCssBlock(".app-shell__avatar-anchor");
    const floatingPanel = getCssBlock(".floating-panel");
    const paletteInput = getCssBlock(".palette-input");
    const mainPanel = getCssBlock(".main-panel");
    const mainPanelContent = getCssBlock(".main-panel__content");

    expect(appShell).toContain("position: relative;");
    expect(avatarAnchor).toContain("position: fixed;");
    expect(floatingPanel).toContain("background: var(--color-main-bg);");
    expect(paletteInput).toContain("background: var(--color-surface-elevated);");
    expect(mainPanel).toContain("padding: 1rem;");
    expect(mainPanelContent).toContain("box-sizing: border-box;");
    expect(mainPanelContent).toContain("padding-top: calc(var(--main-panel-padding) + 0.5rem);");
    expect(mainPanelContent).toContain("padding-left: calc(var(--main-panel-padding) + 1.5rem);");
    expect(mainPanelContent).not.toContain("min-height: calc(100vh");
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
    const goalsList = getCssBlock(".goals-rail__list");

    expect(goalsList).toContain("padding-right: 0.5rem;");
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

  it("keeps project template fields in the task detail page tightly grouped", () => {
    const projectFieldStack = getCssBlock(".task-detail-page__project-field-stack");
    const taskDetailHeaderMain = getCssBlock(".task-detail-page__header-main");
    const taskDetailMeta = getCssBlock(".task-detail-page__meta");
    const taskDetailTitle = getCssBlock(".task-detail-page__title");
    const projectFieldMeta = getCssBlock(".task-detail-page__project-field-meta");
    const projectFieldIcon = getCssBlock(".task-detail-page__project-field-icon");
    const projectFieldInput = getCssBlock(
      ".task-detail-page__project-form-field .ui-input,\n.task-detail-page__project-form-field .ui-select",
    );

    expect(projectFieldStack).toContain("gap: 0.35rem;");
    expect(taskDetailHeaderMain).toContain("gap: 2rem;");
    expect(taskDetailMeta).toContain("padding-bottom: 0;");
    expect(taskDetailTitle).toContain("padding-bottom: 0;");
    expect(projectFieldMeta).toContain("color: var(--color-text-muted);");
    expect(projectFieldIcon).toContain("color: var(--color-text-muted);");
    expect(projectFieldInput).toContain("color: var(--color-text-muted);");
    expect(taskDetailPageSource).toContain("LayersIcon");
    expect(taskDetailPageSource).not.toContain("NoteIcon");
  });

  it("keeps the dashboard graph area as independent cards without a parent slab", () => {
    const goalsDashboard = getCssBlock(".goals-dashboard");
    const goalsDashboardCards = getCssBlock(".goals-dashboard__cards");

    expect(goalsDashboard).toContain("background: transparent;");
    expect(goalsDashboard).toContain("padding: 0;");
    expect(goalsDashboardCards).toContain("gap: 0.9rem;");
  });

  it("keeps markdown list markers readable inside the task editor", () => {
    const formattingBlock = getSourceBlock(vimEditorSource, '".cm-formatting"');
    const formattingListBlock = getSourceBlock(vimEditorSource, '".cm-formatting-list"');
    const concealedListBlock = getSourceBlock(vimEditorSource, '".cm-conceal-widget--list"');
    const concealedHeadingBlock = getSourceBlock(vimEditorSource, '".cm-conceal-widget--heading"');
    const quoteLineBlock = getSourceBlock(vimEditorSource, '".cm-line--quote"');
    const codeBlockLineBlock = getSourceBlock(vimEditorSource, '".cm-line--code-block"');
    const codeBlockInfoBlock = getSourceBlock(vimEditorSource, '".cm-line--code-block-info"');
    const codeBlockBodyBlock = getSourceBlock(vimEditorSource, '".cm-line--code-block-body"');
    const codeBlockEndBlock = getSourceBlock(vimEditorSource, '".cm-line--code-block-end"');

    expect(vimEditorSource).toContain("vimEditorHighlightExtensions");
    expect(vimEditorMarkdownSource).toContain("HighlightStyle.define");
    expect(vimEditorMarkdownSource).toContain("tag: tags.meta");
    expect(vimEditorMarkdownSource).toContain("tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.modifier]");
    expect(vimEditorMarkdownSource).toContain(`tag: tags.heading,
        color: "var(--color-accent)"`);
    expect(vimEditorMarkdownSource).toContain('color: "var(--color-accent-hover)"');
    expect(vimEditorSource).toContain("codeLanguages: vimEditorCodeLanguages");
    expect(formattingBlock).toContain('color: "var(--color-text-secondary)"');
    expect(formattingListBlock).toContain('color: "var(--color-accent-hover)"');
    expect(concealedListBlock).toContain('color: "var(--color-accent-hover)"');
    expect(concealedListBlock).toContain("fontWeight: 600");
    expect(concealedHeadingBlock).toContain('color: "var(--color-accent)"');
    expect(concealedHeadingBlock).toContain('borderRadius: "999px"');
    expect(concealedHeadingBlock).toContain("fontWeight: 700");
    expect(concealedHeadingBlock).toContain('verticalAlign: "baseline"');
    expect(concealedHeadingBlock).toContain('transform: "translateY(-0.06em)"');
    expect(quoteLineBlock).toContain('background: "color-mix(in srgb, var(--color-surface-elevated) 82%, transparent 18%)"');
    expect(quoteLineBlock).toContain('borderLeft: "2px solid var(--color-accent)"');
    expect(quoteLineBlock).toContain('borderRadius: "0.35rem"');
    expect(vimEditorSource).not.toContain('".cm-conceal-widget--quote"');
    expect(codeBlockLineBlock).toContain('background: "color-mix(in srgb, var(--color-surface-elevated) 88%, black 12%)"');
    expect(codeBlockLineBlock).toContain('fontFamily: \'"Recursive Variable", "JetBrains Mono", monospace\'');
    expect(codeBlockInfoBlock).toContain('color: "var(--color-text-secondary)"');
    expect(codeBlockBodyBlock).toContain('color: "var(--color-text-primary)"');
    expect(codeBlockEndBlock).toContain('color: "var(--color-text-primary)"');
    expect(codeBlockEndBlock).not.toContain('color: "transparent"');
    expect(vimEditorSource).toContain('".cm-conceal-widget": {');
  });

  it("does not install a custom code-block exit plugin in the task editor", () => {
    expect(vimEditorSource).not.toContain("markdownCodeBlockExit");
  });

  it("supports multiple fenced code languages and richer code token highlighting in the task editor", () => {
    expect(vimEditorMarkdownSource).toContain('alias: ["javascript", "js", "node", "nodejs", "jsx"]');
    expect(vimEditorMarkdownSource).toContain('alias: ["typescript", "ts", "tsx"]');
    expect(vimEditorMarkdownSource).toContain('alias: ["python", "py"]');
    expect(vimEditorMarkdownSource).toContain('alias: ["bash", "sh", "shell", "zsh"]');
    expect(vimEditorMarkdownSource).toContain("tags.propertyName");
    expect(vimEditorMarkdownSource).toContain("tags.operator");
    expect(vimEditorMarkdownSource).toContain("tags.regexp");
    expect(vimEditorMarkdownSource).toContain("defaultHighlightStyle");
  });

  it("uses bundled recursive typography for the task description editor", () => {
    expect(mainSource).toContain('@fontsource-variable/recursive');
  });

  it("keeps the task editor status bar minimal and flat", () => {
    const taskDetailContent = getCssBlock(".task-detail-page__content");
    const editorSurface = getCssBlock(".vim-editor__surface");
    const editorFrame = getCssBlock(".vim-editor__surface .cm-editor");
    const statusBar = getCssBlock(".vim-editor__status");
    const statusMode = getCssBlock(".vim-editor__status-mode");
    const statusModeInsert = getCssBlock('.vim-editor__status-mode[data-mode="insert"]');
    const statusModeNormal = getCssBlock('.vim-editor__status-mode[data-mode="normal"]');
    const statusModeVisual = getCssBlock('.vim-editor__status-mode[data-mode="visual"]');

    expect(taskDetailContent).toContain("flex: 1;");
    expect(editorSurface).toContain("border: none;");
    expect(editorSurface).toContain("box-shadow: none;");
    expect(editorFrame).toContain("border: none;");
    expect(editorFrame).toContain("outline: none;");
    expect(editorFrame).toContain("box-shadow: none;");
    expect(statusBar).toContain("display: flex;");
    expect(statusBar).toContain("justify-content: space-between;");
    expect(statusBar).toContain("position: fixed;");
    expect(statusBar).toContain("bottom: 1.5rem;");
    expect(statusBar).toContain("width: min(calc(100vw - 4rem), 44rem);");
    expect(statusBar).toContain('background: color-mix(in srgb, var(--color-surface-elevated) 72%, var(--color-main-bg) 28%);');
    expect(statusBar).toContain('font-family: "Recursive Variable", "JetBrains Mono", monospace;');
    expect(statusBar).not.toContain("border:");
    expect(statusMode).toContain("color: var(--color-text-primary);");
    expect(statusMode).toContain("padding:");
    expect(statusModeInsert).toContain("background:");
    expect(statusModeNormal).toContain("background:");
    expect(statusModeVisual).toContain("background:");
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
    const tasksFilterFocus = getCssBlock(".tasks-filter:focus-visible");
    const settingsNavButtonFocus = getCssBlock(".settings-nav__button:focus-visible");
    const themeCardFocus = getCssBlock(".theme-card:focus-visible");
    const newTaskFocus = getCssBlock(".new-task__project-choice:focus-visible");
    const newGoalFocus = getCssBlock(".new-goal__choice:focus-visible");

    expect(tasksFilterFocus).toContain("outline: none;");
    expect(settingsNavButtonFocus).toContain("outline: none;");
    expect(themeCardFocus).toContain("outline: none;");
    expect(newTaskFocus).toContain("outline: none;");
    expect(newGoalFocus).toContain("outline: none;");
  });

  it("does not use ad hoc inline border or shadow styles in feature components", () => {
    const sources = [
      tasksPageSource,
      projectsPageSource,
      goalsPageSource,
      inboxPageSource,
      settingsModalSource,
    ]
      .join("\n");

    expect(sources).not.toMatch(/border[A-Z][A-Za-z]+\s*:/);
    expect(sources).not.toMatch(/boxShadow\s*:/);
  });
});
