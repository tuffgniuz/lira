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

- `Ctrl+\`` toggles the sidebar
- `g t p` opens the `Go to page` palette
- `q c` opens quick capture
- `:` opens the command launcher
- `Esc` closes floating windows

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
