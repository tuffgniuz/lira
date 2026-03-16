<div align="center">

# Kenchi

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/tuffgniuz/kenchi?style=for-the-badge&labelColor=%23181926&color=%23eed49f)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/tuffgniuz/kenchi?style=for-the-badge&labelColor=%23181926&color=%23a6da95)

## Summary
Kenchi is a keyboard-first, local-first desktop knowledge and productivity system built with Tauri and React that combines markdown notes, tasks, projects, goals, journaling, and quick capture into a unified, extensible workflow.
</div>

## Current Scope
The project is currently focused on the application shell and the first keyboard-driven workflows:

- collapsible left sidebar with primary navigation
- theme system with built-in themes and live preview in settings
- vault configuration with native directory picker
- quick capture available from anywhere in the app
- capture inbox list backed by vault storage
- command palette flows for navigation and commands

## Keyboard Shortcuts
Current key-driven interactions:

- Global
  - `Ctrl+\`` toggles the sidebar
  - `:` opens the command launcher
  - `Esc` closes the active modal or palette

- Leader sequences
  - `Space g t p` opens the `Go To Page` palette
  - `Space l p` opens the `Projects` palette
  - `Space n i` opens quick capture
  - `Space n g` opens `New Goal`
  - `Space n t` opens `New Task`
  - `Space n p` opens `New Project`

- Command palettes
  - `Arrow Up` / `Arrow Down` moves selection
  - `Enter` confirms the highlighted item
  - `Esc` closes the palette

- Tasks and goals detail panels
  - `Esc` closes the selected task detail panel
  - `Esc` closes the selected goal detail panel
  - `Ctrl+z`, then `z` closes the selected task detail panel

- Journaling
  - `j` moves to the next day in the day list when you are not typing
  - `k` moves to the previous day in the day list when you are not typing
  - `Enter` re-selects the focused day from the journal day list

- Modal submit behavior
  - `Enter` submits `New Task`, `New Goal`, and `New Project` from single-line inputs and selects
  - `Ctrl+Enter` / `Cmd+Enter` submits `New Task` and `New Goal` while focused in a textarea
  - `Enter` submits `New Project` from the description textarea
  - `Shift+Enter` inserts a newline in the `New Project` description textarea

## Vault Storage
Kenchi currently uses a vault-based storage model.

- a vault is a user-selected directory
- if the selected vault path does not exist, Kenchi creates it
- `~` paths such as `~/Documents/kenchi` are supported
- captured inbox items are currently stored in `.inbox/inbox.json` inside the vault

Example:

```text
/home/your-user/Documents/kenchi/.inbox/inbox.json
```

## Local Development
Install dependencies:

```bash
pnpm install
```

Run the desktop app:

```bash
pnpm tauri dev
```

Run the web dev server only:

```bash
pnpm dev
```

Create a production frontend build:

```bash
pnpm build
```

## Notes
- The app is local-first, but the vault model is intended to remain compatible with future sync workflows.
- Themes are token-based so additional built-in or user-defined themes can be added later without rewriting component styles.
