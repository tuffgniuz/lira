<div align="center">

# Lira

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/tuffgniuz/lira?style=for-the-badge&labelColor=%23181926&color=%23eed49f)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/tuffgniuz/lira?style=for-the-badge&labelColor=%23181926&color=%23a6da95)

*/ˈliː.ra/ (LEE-rah)*

**noun**

A state of smooth, continuous movement; flow without friction.  

## Summary
Lira is an opinionated, keyboard-first, local-first desktop system for independent work.
</div>

## Keymappings
- Global
  - `Ctrl+\`` toggles the sidebar
  - `:` opens the command launcher
  - `Esc` closes the active modal or palette
  - `Shift+H` moves backward through navigation history
  - `Shift+L` moves forward through navigation history

- Leader sequences
  - `Space g t p` opens the `Go To Page` palette
  - `Space l p` opens the `Projects` palette
  - `Space l t` opens the `Tasks` palette
  - `Space l g` opens the `Goals` palette
  - `Space l i` opens the `Inbox` palette
  - `Space n i` opens quick capture
  - `Space n g` opens `New Goal`
  - `Space n t` opens `New Task`
  - `Space n p` opens `New Project`

- Command palette
  - `Arrow Up` / `Arrow Down` moves selection
  - `Ctrl+P` / `Ctrl+N` moves selection
  - `Tab` / `Shift+Tab` cycles selection
  - `Enter` confirms the highlighted item
  - `Esc` closes the palette

- Tasks page
  - `j` / `ArrowDown` moves to the next task
  - `k` / `ArrowUp` moves to the previous task
  - `Enter` opens the highlighted task

- Task detail page
  - opens with the editor focused in Vim insert mode
  - `Esc` closes the page when the editor is in normal mode
  - `Shift+H` / `Shift+L` works in normal mode for history navigation

- Projects page (List View)
  - `n` creates a new task
  - `x` toggles the completion status of the highlighted task
  - `d` (when pressed twice) deletes the highlighted task
  - `1` filters the list to show "To do" tasks
  - `2` filters the list to show "Completed" tasks
  - `3` filters the list to show "All" tasks

- Projects board
  - `h` / `ArrowLeft` focuses the previous lane
  - `l` / `ArrowRight` focuses the next lane
  - `Tab` / `Shift+Tab` cycles lane focus
  - `j` moves to the next task inside the focused lane
  - `k` moves to the previous task inside the focused lane
  - `n` creates a new task in the focused lane
  - `Enter` opens the focused task
  - `Shift + H` moves the selected task card to the lane on the left
  - `Shift + L` moves the selected task card to the lane on the right

- Modal submit behavior
  - `Enter` submits `New Task`, `New Goal`, and `New Project` from single-line inputs and selects
  - `Ctrl+Enter` / `Cmd+Enter` submits `New Task` and `New Goal` while focused in a textarea
  - `Enter` submits `New Project` from the description textarea
  - `Shift+Enter` inserts a newline in the `New Project` description textarea

## Vault Storage
Lira currently uses a vault-based storage model.

- a vault is a user-selected directory
- if the selected vault path does not exist, Lira creates it
- `~` paths such as `~/Documents/lira` are supported
- captured inbox items are currently stored in `.inbox/inbox.json` inside the vault

Example:

```text
/home/your-user/Documents/lira/.inbox/inbox.json
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
