## Lira Overview

Lira is a local-first, keyboard-driven desktop productivity app built with Tauri, React, TypeScript, and a Rust backend.

The app is designed around distinct but connected domains such as:
- captures / inbox
- tasks
- goals
- projects
- tags
- relationships

Lira is not a generic CRUD dashboard. It should feel fast, intentional, and structured.

---

## Core Engineering Rules

### 1. Respect the architecture boundary

Lira uses a Rust backend as the local persistence and filesystem boundary.

That means:
- Rust owns local disk access
- Rust owns SQLite access
- Rust owns vault path handling and initialization
- Rust exposes typed Tauri commands to the frontend

The frontend must not directly access SQLite.
The frontend must not introduce its own persistence layer for the same entities.
Do not create duplicate sources of truth between Rust and TypeScript.

### 2. Local-first only unless explicitly requested

By default:
- all persistence is local
- storage is on local disk
- structured data uses SQLite
- no remote backend should be introduced unless explicitly requested

Do not add Supabase, sync, cloud APIs, or remote persistence unless the task explicitly asks for it.

### 3. No overloaded polymorphic persistence model

Do not use a generic `Item` model as the canonical persistence model.

Persistence should use first-class entities with clear boundaries, such as:
- Capture
- Task
- Goal
- GoalProgressEntry
- Project
- Tag
- Relationship
- UserProfile

A UI-level union or adapter type is acceptable if needed for rendering or search results.
It must not become the database source of truth.

### 4. Prefer small, explicit domain models

Do not create giant catch-all models full of unrelated optional fields.

Prefer:
- specific entities
- explicit statuses
- clear naming
- stable identifiers
- consistent timestamps

### 5. Keep the system maintainable

Favor:
- explicit repository functions
- predictable command boundaries
- typed DTOs between Rust and TypeScript
- small migrations
- testable logic

Avoid:
- hidden magic
- speculative abstractions
- over-generalized frameworks
- future-proofing for features not being built now

---

## UI / Design Language Rules

This section has equal priority to Core Engineering Rules.

Lira uses a calm, flat, keyboard-first design language.

The UI must feel:
- minimal
- focused
- structured
- local-first and serious
- designed for builders and keyboard-driven users

It must NOT feel like:
- a flashy SaaS dashboard
- an admin panel
- a heavily decorated consumer app

### Core visual rules

#### 1. No borders
Do not use borders for layout separation or component styling.

Avoid:
- `border`
- `border-width`
- `divide-*`
- outline-based card styling

Use instead:
- background tone differences
- spacing
- typography hierarchy
- grouping through layout

#### 2. No shadows
Do not use:
- `box-shadow`
- drop shadows
- glow effects
- elevation effects

Avoid visual depth tricks.
Lira should remain visually flat.

#### 3. No decorative depth
Do not use:
- glassmorphism
- floating card aesthetics
- heavy gradients
- ornamental effects unless explicitly requested

### Hierarchy rules

Use these to create hierarchy instead of borders or shadows:
- typography
- spacing
- subtle surface contrast
- layout rhythm
- restrained accent color

Headings, panels, and sections should be distinguished through:
- font size
- font weight
- text contrast
- vertical spacing
- surface background changes

### Surface rules

Use flat surfaces with subtle tonal separation.

Examples:
- sidebar background differs from main content
- panels differ slightly from page background
- active items use background fill changes
- selected state should not rely on borders or shadows

### Focus and active state rules

Lira is keyboard-first, so focus and active states must always be visible.

Prefer:
- background change
- text color change
- accent fill
- accent side marker if needed
- stronger contrast

Avoid:
- glowing rings
- heavy outlines
- shadow-based focus states

If accessibility requires a focus indicator, keep it minimal and aligned with the flat design language.

### Component strategy

Prefer reusable React components over repeated page-specific markup.

When possible, build or reuse shared primitives such as:
- PageShell
- Section
- Stack
- Inline
- Panel
- List
- ListItem
- EmptyState
- CommandMenu
- Modal
- FormField
- ActionBar
- ProgressRow

Do not duplicate similar UI patterns across pages when a reusable component is appropriate.

### React implementation rules

- Prefer composition over large monolithic components
- Create reusable UI primitives when the same pattern appears more than once or is clearly likely to recur
- Keep presentational components separate from data-fetching logic where practical
- Avoid one-off inline styling patterns when a shared component or utility can express the same design consistently
- Keep UI code consistent across pages

### Styling rules

Use styling to reinforce:
- calmness
- clarity
- consistency
- keyboard-first usability

Do not add styling that is merely decorative.

Every UI choice should support:
- readability
- navigation
- focus
- execution

### Default visual bias

When unsure, prefer:
- flatter
- simpler
- quieter
- more reusable
- more typographic
- less decorative

---

## Required Development Workflow: Strict TDD

All code changes must follow test-driven development.

### Required loop

For every feature, bugfix, refactor, or persistence change:

1. Write a failing test first
2. Confirm the test would fail
3. Implement the minimum code needed to pass
4. Refactor while keeping tests green

Do not write implementation first and add tests afterward.

If a task cannot reasonably be tested, stop and explain why before proceeding.

### TDD rules

- Tests define behavior
- Code satisfies tests
- Prefer behavior-focused tests over implementation-detail tests
- Do not skip tests because a change seems small
- Do not claim TDD if tests were added after implementation

---

## Testing Rules

### General

- Add or update tests for every meaningful behavior change
- Prefer realistic behavior-oriented tests
- Avoid brittle tests tied too tightly to internal implementation details
- Keep tests readable and focused

### Rust backend

When changing:
- SQLite schema
- repositories
- path handling
- Tauri commands
- migration logic

You must add or update Rust tests where appropriate.

At minimum, test:
- create
- read
- update
- archive/delete if relevant
- filtering/query behavior
- edge cases
- migration/bootstrap behavior when relevant

### Frontend

When changing:
- forms
- flows
- state behavior
- command interactions
- feature behavior

Add or update frontend tests where appropriate.

Prefer tests for:
- creating a task
- creating a goal
- processing a capture
- project board behavior
- filtering and rendering important states

Do not over-focus on styling tests.

---

## Persistence Rules

### SQLite

Structured data must use SQLite.

Do not introduce or preserve JSON-file persistence for structured entities unless explicitly required for a specific migration or compatibility reason.

If legacy JSON persistence exists and is being replaced:
- migrate carefully
- remove obsolete code paths cleanly
- do not leave parallel JSON and SQLite persistence active for the same data

### Rust ownership

Rust is the owner of:
- opening the database
- migrations / schema initialization
- path resolution
- filesystem operations
- repository/data-access logic
- Tauri commands that expose persistence operations

### Frontend data access

The frontend must work with data through typed service functions that call Tauri commands.

Do not scatter raw `invoke(...)` calls across random components.

Preferred pattern:
- `src/services/...` wraps command calls
- components call services/hooks/stores
- DTOs are explicit and typed

---

## Model Design Rules

### Common principles

All first-class entities should use:
- stable `id`
- explicit timestamps
- clear status fields
- nullable fields only when they are truly optional

### Task design

Keep separate:
- lifecycle status
- task workflow status
- scheduling bucket

### Goal design

Goals must be first-class records.

They must support:
- activity goals
- outcome goals
- milestone goals
- manual or automatic tracking
- progress logging

Do not store time-series progress inside a single object when a separate table is more appropriate.

### Capture design

Captures are first-class entities.
They are not just unfinished tasks.

### Tags

Prefer:
- tags table
- entity_tags join table

Avoid relying only on embedded arrays.

### Relationships

Use explicit relationship records instead of implicit linking.

---

## Migration Rules

When changing models or persistence:
- preserve clarity
- add migrations intentionally
- document what changed
- keep compatibility layers minimal

If full migration is too large:
- isolate legacy code
- clearly mark TODOs
- do not fake completeness

---

## UI / Frontend Rules

### Keep the UI intent-first

The UI should reflect user intent, not backend complexity.

### Keep components clean

- components focus on rendering and interaction
- services/hooks handle data
- avoid mixing persistence logic into UI

### Keyboard-first matters

- preserve keyboard usability
- maintain clear focus states
- avoid mouse-only flows

---

## Scope Control

Do not introduce large architecture changes beyond the requested task.

Do not:
- add cloud sync
- add Supabase
- add plugin marketplace concepts
- invent speculative abstractions

When in doubt:
- implement the smallest correct change
- keep the system cleaner than before

---

## Code Change Expectations

For every substantial task:

1. Inspect existing code
2. Make a short plan
3. Write failing tests first
4. Implement the change
5. Verify tests
6. Summarize:
   - files changed
   - what changed
   - compatibility layers
   - TODOs

Do not make silent architecture decisions.

---

## Anti-Patterns: Do Not Do These

- Reintroduce `Item` as persistence source of truth
- Duplicate persistence across Rust and TypeScript
- Add tests after implementation and call it TDD
- Keep both JSON and SQLite active
- Put DB logic in React components
- Add remote backend without explicit request
- Over-abstract for hypothetical futures

---

## Preferred Delivery Style

- be explicit
- be incremental
- favor correctness over cleverness
- document follow-up work

If something is unclear:
- say so directly
