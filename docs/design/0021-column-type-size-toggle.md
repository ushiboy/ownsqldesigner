# Column Type / Size Toggle

- **Status**: Implemented
- **Created**: 2026-08-02
- **Updated**: 2026-08-02

## Context

`TableNode` on the canvas renders only each column's name — seeing its type or size requires opening the column's edit dialog. REQ-012 asks for a toolbar-level toggle to show that detail inline, for users who want it visible while designing without needing to be told what it currently is via inline dialogs. `formatColumnType` already exists (previously private to `src/domain/sqlite/generateDdl.ts`) producing `TYPE(size)` / bare `TYPE`; this feature reuses it rather than inventing new formatting.

## Goals / Non-Goals

**Goals**

- A toolbar toggle button that shows/hides `TYPE(size)` text next to each column name on every table node.
- Defaults to shown.
- The choice persists across reloads (browser storage), independent of any general settings feature.

**Non-Goals**

- A settings dialog (REQ-032) — same deferral as [0018](0018-dark-mode-toggle.md): this toggle lives directly in the toolbar for now.
- Showing other column attributes (nullable, default, auto-increment) — only type/size, per REQ-012's wording.
- Per-table overrides — a single global switch.

## Design

### Shared `formatColumnType`

`formatColumnType` moved from a private function in `generateDdl.ts` to `src/domain/schema/column.ts` (exported via `src/domain/schema/index.ts`), typed against `Pick<Column, "type" | "size">` so callers that only carry a partial column shape (e.g. Canvas's mapped node data) can call it directly. `generateDdl.ts` now imports it instead of duplicating the `size === "" ? type : "TYPE(size)"` logic — DDL generation and canvas display share one implementation.

### `useColumnDetailsVisibility` hook

`src/pages/MainScreen/hooks/useColumnDetailsVisibility.ts` — a plain hook (no Context; see Alternatives Considered), following the shape of `useThemePreference` but boolean instead of 3-state:

- State: `showColumnDetails: boolean`, seeded from an optional `initialShowColumnDetails` param (tests/stories), else from `localStorage["ownsqldesigner:showColumnDetails"]` if valid, else `true`.
- A `useEffect` persists the value on change.
- `toggleShowColumnDetails()` flips it.
- No `useLayoutEffect`/DOM write is needed (unlike theme) — this only affects React-rendered content, not a pre-paint CSS flash.

### Wiring

`showColumnDetails`/`toggleShowColumnDetails` are read once in `MainScreenContent` and passed down as props through `MainScreenView` to both `Toolbar` (the button) and `Canvas` (rendering), exactly like the existing `theme`/`onCycleTheme` pair. `MainScreenSeed` gains `initialShowColumnDetails` for story/test seeding.

### Canvas / TableNode data flow

React Flow's `nodeTypes` components (`TableNode`) only receive their own node's `data` — not arbitrary sibling props from `<Canvas>` — so the flag can't be read per-column-render from a prop passed alongside `<TableNode>`. Instead, `Canvas`'s `tablesToNodes` gains a `showColumnDetails` parameter and precomputes the formatted label once per column: `typeLabel: showColumnDetails ? formatColumnType({ type, size }) : null`. `TableNodeColumn` gains `typeLabel: string | null`; `TableNode.tsx` renders it next to the column name only when non-null. This keeps `TableNode` a dependency-free presentational leaf — no domain import, no formatting logic — matching its current shape.

### Toolbar button

One icon button (`LuType` from `react-icons/lu`) in the toolbar's right-aligned group, next to the theme toggle. Unlike the theme button's 3-way cycle, this is a strict boolean toggle, so it follows the side-panel toggle's pattern: `aria-pressed={showColumnDetails}` and `toolButton({ pressed: showColumnDetails })`.

## Alternatives Considered

- **A `ColumnDetailsContext`** — rejected: single producer (the toolbar button), single consumer path (`Canvas` → `TableNode`). The codebase already establishes shallow prop-drilling as the right call for this shape of state (`isSidePanelOpen`, `theme`), reserving Context for state read across many distant consumers ([0011](0011-main-screen-state-composition.md)).
- **Passing raw `type`/`size` plus a `showColumnDetails` boolean into `TableNodeColumn`, formatting inside `TableNode.tsx`** — rejected: it would pull a domain-layer import (`formatColumnType`) into a presentational leaf component for no benefit. Precomputing in `tablesToNodes` (which already imports from `domain/schema`) keeps that import at the existing boundary.
- **A per-table override** — rejected as unnecessary scope beyond REQ-012's wording, which describes a single canvas-wide toggle.
