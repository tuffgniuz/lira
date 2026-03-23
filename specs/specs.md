# Lira Project Specification

## 1. Overview

Lira is a local-first, keyboard-driven desktop productivity and knowledge tool built with **Tauri** and **React**. Its purpose is to help users capture thoughts quickly, manage tasks, organize project work, write and connect markdown notes, review progress, define measurable goals, and navigate everything through a shared tagging and linking system.

Lira is designed first for users who think and work through the keyboard, especially those familiar with Vim-like workflows. It should feel fast, structured, extensible, and personal. It is not meant to be a bloated workspace platform or a team collaboration tool. It is a focused personal operating system for thought and execution.

The app must also be plugin-based and themeable from the start, so that future functionality can be added without forcing major rewrites.

---

## 2. Product Vision

Lira should combine these ideas into one coherent workflow:

* capture quickly
* organize clearly
* execute intentionally
* review consistently
* extend freely

The app should support the full loop:

**Capture → Process → Work → Track → Review**

Example flow:

* A user captures an idea into the inbox
* That inbox item becomes a task or note
* A task may belong to a project
* A goal may track related tasks
* A goal may summarize progress across related tasks
* Notes, tasks, goals, projects, and inbox items can all be connected through tags and links

Lira should feel like a keyboard-first hybrid of:

* markdown notes
* task management
* personal project planning
* structured review
* lightweight goal tracking

---

## 3. Core Product Principles

### 3.1 Local-first

All user data should be stored locally by default. The application should work offline and not depend on a remote backend for core functionality.

### 3.2 Keyboard-first

All important workflows must be possible without touching the mouse. The mouse may be supported, but it is secondary.

### 3.3 Markdown-native

Notes should use markdown as the primary content format. Tasks may also exist inside markdown contexts or as structured data that can be rendered in markdown-like ways.

### 3.4 Plugin-based

Lira should be architected so that future features can be implemented as plugins, including official first-party modules.

### 3.5 Themeable

Lira should support both built-in and user-defined themes through a token-based theme system.

### 3.6 Simple by default

The first version should not try to solve every productivity problem. Features must remain lightweight and tightly scoped.

---

## 4. Target User

Lira is primarily designed for:

* individual users
* developers
* power users
* keyboard-driven users
* users who like markdown and local files
* users who want a personal system rather than a team platform

Secondary audience:

* writers
* note-takers
* indie hackers
* planners
* people who value structured review and thoughtful planning

---

## 5. Tech Stack

### 5.1 Desktop Framework

* **Tauri** for desktop shell, native integration, filesystem access, packaging, and secure backend operations

### 5.2 Frontend

* **React**
* **TypeScript**
* **Vite**

### 5.3 Backend / Native Layer

* **Rust**, inside Tauri

### 5.4 Storage

Initial version should prioritize local filesystem storage and lightweight local structured storage where needed.

Possible storage split:

* markdown files for notes
* JSON or SQLite for structured entities like tasks, projects, goals, tags, UI state, and plugin metadata

This decision can be finalized later, but the architecture should allow both text-based content and structured relational content cleanly.

---

## 6. Core Feature Set

Lira will include the following product domains:

* Notes
* Tasks
* Capture Inbox
* Goals
* Projects
* Tagging System
* Keyboard-driven workflow
* Plugin system
* Built-in themes
* Custom user-defined themes

---

## 7. Functional Modules

## 7.1 Notes

### Purpose

Provide a markdown-based knowledge base for writing, storing, linking, and searching personal notes.

### Requirements

* Create, edit, rename, and delete markdown notes
* Notes must support markdown syntax
* Notes must be searchable
* Notes must support tags
* Notes should support internal linking
* Notes should be locally stored
* Notes should integrate with projects and tasks where relevant

### Desired capabilities

* wiki-style note linking such as `[[note-name]]`
* backlinks later
* note metadata support
* preview/edit mode if needed, though editing experience should be clean enough that separate preview may not always be needed

### Notes and system integration

* Notes can belong to a project optionally
* Notes can have tags
* Notes can link to tasks, goals, or other notes
* Notes may be created from inbox items

---

## 7.2 Tasks

### Purpose

Track actionable items across personal and project contexts.

### Requirements

* Create, edit, complete, delete, and reopen tasks
* Tasks must exist independently or be linked to a project
* Tasks must support status
* Tasks must support tags
* Tasks should be filterable and searchable
* Tasks should be visible in a global task view

### Task status

Initial built-in statuses:

* todo
* in_progress
* done

These statuses should also drive kanban board lanes for projects.

### Optional fields

* title
* description
* status
* tags
* linked project
* linked goal
* source inbox item
* due date
* created date
* completed date

### Task integration

* Tasks can be created from inbox items
* Tasks can be linked to goals
* Tasks can belong to projects
* Tasks can be referenced from notes
* Tasks can be tagged for filtering and goal tracking

---

## 7.3 Capture Inbox

### Purpose

Act as the low-friction entry point for quick capture.

### Requirements

* Quick capture should be extremely fast
* User should be able to open capture with a keyboard shortcut
* Inbox items should require minimal structure at creation time
* Inbox items should be reviewable later
* Inbox items can be converted into tasks, notes, or project-related entries

### Inbox item types

At minimum, inbox items can begin as generic captures. Over time they may be processed into:

* task
* note
* project idea
* goal idea
* archived/discarded item

### Capture workflow

* trigger quick capture
* enter text
* save immediately
* later process item into a more structured object

### Inbox integration

* Inbox items can have tags
* Inbox items can be linked to goals
* Inbox items can be linked to projects
* Inbox items may become tasks or notes

---

## 7.4 Goals

### Purpose

Allow users to define measurable targets over a time period and track progress automatically.

### Core concept

Goals are not just another task list. A goal measures progress against activity.

### Supported periods

* daily
* weekly
* monthly
* yearly

### Example goals

* complete 3 tasks today
* review goals daily
* process 5 inbox items today
* complete 10 project tasks this week

### Requirements

* Create, edit, archive, and delete goals
* Goals must support a target number
* Goals must support a period
* Goals must support metric type
* Goals may support optional filters such as tags or project association

### Goal metric examples

* tasks completed
* inbox items processed
* notes created
* tasks completed with a specific tag
* tasks completed in a specific project

### Goal integration

* Goals can be linked to tasks
* Goals can be linked to inbox items
* Goals can be filtered by tags
* Goals can track project-related activity

### UI behavior

Goals should remain lightweight and progress-focused. No complex analytics dashboard is required for the first version.

---

## 7.5 Projects

### Purpose

Organize and manage groups of related tasks and optionally related notes, goals, and captures.

### Core concept

A project is a lightweight container for structured work. Not all tasks belong to a project, but some do.

### Requirements

* Create, edit, archive, and delete projects
* Projects must have a name
* Projects may have a description
* Projects can contain linked tasks
* Projects may include project notes
* Projects can support tags
* Projects can be linked to goals and inbox items

### Kanban board

Each project should include a kanban board view with default lanes:

* To Do
* In Progress
* Done

Task status should drive lane placement. Lane changes should update task status directly.

### Project integration

* Tasks can belong to a project
* Notes can be linked to a project
* Inbox items can be linked to a project
* Goals can track project tasks
* Projects can use tags

### Scope guard

Projects should remain lightweight. Lira should not become an enterprise PM tool.

---

## 7.6 Tagging System

### Purpose

Provide a shared organizational layer across all major entities.

### Taggable entities

* notes
* tasks
* inbox items
* goals
* projects
### Requirements

* Create and assign tags
* Filter entities by tags
* Search by tags
* Display shared tag views
* Support multiple tags per item

### Design principle

Projects organize, tags relate, links reference.

### v1 recommendation

Use flat tags only. Avoid nested or hierarchical tag systems in the first version.

Examples:

* `#work`
* `#personal`
* `#project-x`
* `#idea`
* `#urgent`

---

## 8. Keyboard-Driven Workflow

### Purpose

Lira must feel fully operable through the keyboard.

### Core requirements

* Global shortcuts
* Keyboard navigation for all main panes
* Command palette
* Mode-based interaction
* Focus management
* Vim-inspired movement and flow

### Modes

Initial recommended modes:

* Normal mode
* Insert mode
* Command mode

Visual mode may be considered later.

### Expected keyboard capabilities

* navigate lists and panes
* open notes/tasks/projects
* invoke commands
* create captures
* move kanban cards
* switch focus between UI areas
* enter and exit editing cleanly

### Example key concepts

* `j/k` move vertically
* `h/l` move horizontally or switch pane focus
* `/` search
* `:` command palette
* `i` enter edit mode
* `esc` return to normal mode
* `enter` open item

The exact default mapping may evolve, but the architecture must support this from the beginning.

---

## 9. Plugin System

### Purpose

Allow Lira to be extended over time by first-party and third-party plugins.

### Architectural principle

The plugin model should not be an afterthought. Core systems must be built to expose extension points from day one.

### Plugin goals

* first-party modules may also be implemented as plugins where reasonable
* third-party plugins should be possible later
* plugin runtime should be safe and structured
* plugins should be able to contribute UI, commands, and behaviors

### Initial plugin capabilities

Plugins should eventually be able to register:

* commands
* views
* keymaps
* hooks
* settings panels
* data processors
* AI tools
* theme-aware UI components

### Recommended plugin model

Initial plugin development should favor TypeScript or JavaScript-based plugins rather than Rust plugins for ease of iteration.

### Example plugin API shape

* registerCommand
* registerView
* registerKeymap
* registerHook
* emitEvent
* onEvent

### Security consideration

Plugins should not get unrestricted access to native APIs by default. Future permissions may include:

* filesystem read
* filesystem write
* AI access
* command registration
* UI contribution access

---

## 10. Theme System

### Purpose

Provide a flexible visual system with both built-in and user-defined themes.

### Theme requirements

* built-in theme support
* custom theme support
* live theme switching
* theme persistence
* theme tokens must drive app styling
* plugins must be able to consume shared theme tokens

### Theme design

Themes should be defined as structured token sets, not raw ad hoc CSS overrides.

### Token categories

Examples:

* background
* foreground
* border
* muted
* accent
* success
* warning
* error
* sidebar background
* panel background
* editor background
* selection
* focus ring

Syntax-related tokens:

* keyword
* string
* comment
* function
* type
* heading
* link

### Built-in themes

Initial support should focus on a small curated set of popular themes, such as:

* Tokyo Night
* Catppuccin
* Rozejin
* Nord
* Dracula
* One Dark
* Solarized

### Custom themes

Users should be able to define their own themes via local theme files such as JSON.

### Appearance vs theme

Theme handles colors.
Appearance settings should be separate and may later include:

* font family
* font size
* line height
* cursor style
* density
* border radius

---

## 11. App Shell and Navigation

### Main sidebar sections

Recommended top-level navigation:

* Inbox
* Notes
* Tasks
* Projects
* Goals
* Journal
* Search

### Layout

Recommended layout:

* left sidebar for navigation
* main center content area
* optional right sidebar for details, metadata, tags, backlinks, AI prompts, or related entities
* optional bottom panel later for logs, output, or plugin surfaces

### Focus model

The active pane must always be obvious. Keyboard navigation and commands should operate based on focused region.

---

## 12. Data Model Overview

The exact persistence implementation may change, but the logical domain model should include the following core entities:

### Note

* id
* title
* content
* tags
* linked project
* created_at
* updated_at

### Task

* id
* title
* description
* status
* tags
* linked project
* linked goal
* source inbox item
* due_date
* created_at
* completed_at

### InboxItem

* id
* content
* tags
* linked project
* linked goal
* created_at
* processed_at
* converted_to_type

### JournalEntry

* id
* title or date-based label
* content
* tags
* created_at
* updated_at

### Goal

* id
* title
* period
* metric_type
* target_value
* filter_definition
* linked tags
* linked project
* created_at
* archived_at

### Project

* id
* name
* description
* tags
* status optional
* created_at
* updated_at

### Tag

* id
* name
* color optional later

### Link / Relationship

May be explicit or derived, depending on architecture:

* source entity
* target entity
* relation type

---

## 13. Storage Considerations

Because Lira mixes markdown content and structured productivity data, it may benefit from hybrid storage.

### Candidate approach

* store notes as markdown files
* store tasks, projects, goals, tags, and UI/plugin metadata in JSON or SQLite
* maintain references between systems via IDs

### Alternative

Use SQLite for structured storage and export/import markdown-friendly views where appropriate.

### Recommendation

Do not force everything into raw markdown if it creates complexity for tasks, projects, goals, and kanban state. Markdown should remain strong where it fits best: notes.

---

## 14. Search and Discovery

Lira should support unified search across:

* notes
* tasks
* inbox items
* projects
* goals
* tags

Search should later support:

* by title
* by content
* by tag
* by entity type
* by project
* by date

A keyboard-driven command/search palette should be central to the user experience.

---

## 15. AI Integration

AI should be additive and restrained.

### Initial AI focus

* capture processing assistance
* summaries
* tag suggestions
* task extraction from inbox or note content

### Out of scope initially

* replacing the core writing experience
* over-automating planning
* making the app dependent on AI for basic use

AI should be optional and not required for the app to remain useful.

---

## 16. Non-Goals for Initial Version

To protect scope, the initial version should avoid:

* team collaboration
* cloud-first architecture
* real-time sync
* enterprise project management complexity
* complex permissions management for multiple users
* nested tag systems
* plugin marketplace
* theme editor UI
* giant analytics dashboards
* mobile support before desktop is solid

---

## 17. Suggested MVP Scope

The first usable version should focus on these areas:

* app shell
* keyboard navigation and focus system
* command palette
* notes
* capture inbox
* tasks
* projects with kanban
* goals
* tags
* basic theme system
* plugin-ready architecture foundation

### MVP priorities in implementation order

1. app shell and keyboard architecture
2. command registry and focus system
3. local storage foundation
4. inbox capture
5. notes
6. tasks
7. projects and kanban
8. tags
9. goals
10. theme system
11. plugin API foundations

This is the right order because it builds the platform before the surface features.

---

## 18. Product Identity Summary

Lira is:

* local-first
* keyboard-first
* markdown-native where it makes sense
* plugin-based
* themeable
* built for thought, execution, and reflection

Lira is not:

* a bloated Notion clone
* a team PM suite
* a mouse-first dashboard app
* an AI gimmick tool

It should feel like a serious, extensible desktop tool for people who think and work through the keyboard.

If you want, next I’ll turn this into a more formal **engineering spec with architecture, folder structure, module boundaries, and suggested data storage design for Tauri + React**.
