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

## Introduction
Lira exists to solve a specific problem I have: managing multiple projects, tasks, and captured thoughts without breaking a keyboard-driven workflow.

A large part of Lira was vibe-coded to get a working prototype fast. Some of that code is messy, and there are parts I simply don’t like or wouldn’t write that way myself. Because of that, a full rewrite is very likely at some point.

That said, despite the rough edges, Lira is genuinely useful. I use it daily, and it already solves a real pain point for me.

Lira is built around my personal workflow, but anyone can use it. Just expect things to be incomplete, occasionally inconsistent, and very much in alpha.

## Keymappings

| Scope | Keybinding | Action |
| :--- | :--- | :--- |
| **Global** | `Ctrl+\`` | Toggles the sidebar |
| | `:` | Opens the command launcher |
| | `Esc` | Closes the active modal or palette |
| | `Shift+H` | Moves backward through navigation history |
| | `Shift+L` | Moves forward through navigation history |
| **Leader sequences** | `Space g t p` | Opens the `Go To Page` palette |
| | `Space l p` | Opens the `Projects` palette |
| | `Space l t` | Opens the `Tasks` palette |
| | `Space l g` | Opens the `Goals` palette |
| | `Space l i` | Opens the `Inbox` palette |
| | `Space n i` | Opens quick capture |
| | `Space n g` | Opens `New Goal` |
| | `Space n t` | Opens `New Task` |
| | `Space n p` | Opens `New Project` |
| **Command palette** | `Arrow Up` / `Arrow Down` | Moves selection |
| | `Ctrl+P` / `Ctrl+N` | Moves selection |
| | `Tab` / `Shift+Tab` | Cycles selection |
| | `Enter` | Confirms the highlighted item |
| | `Esc` | Closes the palette |
| **Goals page** | `Ctrl+H` / `Ctrl+ArrowLeft` | Focuses the previous column (left or center) |
| | `Ctrl+L` / `Ctrl+ArrowRight` | Focuses the next column (center or right) |
| | `j` / `ArrowDown` | Moves to next goal card or filter (based on active column) |
| | `k` / `ArrowUp` | Moves to previous goal card or filter (based on active column) |
| | `Tab` / `Shift+Tab` | Cycles selection (goal card or filter) |
| | `Enter` | Opens the focused goal |
| | `d` (twice) | Deletes the focused goal |
| **Tasks page** | `j` / `ArrowDown` | Moves to the next task |
| | `k` / `ArrowUp` | Moves to the previous task |
| | `Enter` | Opens the highlighted task |
| **Task detail page** | `Esc` | Closes the page when the editor is in normal mode |
| | `Shift+H` / `Shift+L` | Works in normal mode for history navigation |
| **Projects page (List)** | `Space p d` | Opens a palette listing docs linked to the current project |
| | `n` | Creates a new task |
| | `x` | Toggles the completion status of the highlighted task |
| | `d` (twice) | Deletes the highlighted task |
| | `1` | Filters the list to show "To do" tasks |
| | `2` | Filters the list to show "Completed" tasks |
| | `3` | Filters the list to show "All" tasks |
| **Projects board** | `h` / `ArrowLeft` | Focuses the previous lane |
| | `l` / `ArrowRight` | Focuses the next lane |
| | `Tab` / `Shift+Tab` | Cycles lane focus |
| | `j` | Moves to the next task inside the focused lane |
| | `k` | Moves to the previous task inside the focused lane |
| | `n` | Creates a new task in the focused lane |
| | `Enter` | Opens the focused task |
| | `Shift+H` | Moves the selected task card to the lane on the left |
| | `Shift+L` | Moves the selected task card to the lane on the right |
| **Modal submit** | `Enter` | Submits `New Task`, `New Goal`, `New Project` (single-line inputs/selects) |
| | `Ctrl+Enter` / `Cmd+Enter` | Submits `New Task`, `New Goal` (textarea) |
| | `Enter` | Submits `New Project` (description textarea) |
| | `Shift+Enter` | Inserts a newline in `New Project` description textarea |

## Vault Storage
Lira currently uses a vault-based storage model.

- a vault is a user-selected directory
- if the selected vault path does not exist, Lira creates it
- `~` paths such as `~/Documents/lira` are supported
- the primary database is stored as `lira.sqlite3` in the root of your vault
- captured inbox items are currently stored in `.inbox/inbox.json` inside the vault

Example:

```text
/home/your-user/Documents/lira/lira.sqlite3
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
