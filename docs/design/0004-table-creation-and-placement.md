# Table Creation and Placement

- **Status**: Implemented
- **Created**: 2026-07-20
- **Updated**: 2026-07-20

## Context

[0001](0001-main-screen.md) sketched the canvas and side-panel shape around
tables before the table model existed: table nodes on a pannable React Flow
canvas (REQ-001), and a side panel that edits "table name and comment
(REQ-009)" for the current selection. [0002](0002-schema-persistence-and-creation.md)
deliberately stubbed `tables` as `z.array(z.never())`, always persisted as
`[]`, "widened when the table model is designed (REQ-009's doc)". Until now
the Canvas component has been a stub with empty `nodes`/`edges`, the
Toolbar's "Add Table" button has been inert, and the side panel has only ever
shown schema-level metadata.

This doc designs the table model and wires it end to end: creating a table
from the toolbar, rendering it on the canvas, and editing its name/comment
from the side panel.

## Goals / Non-Goals

**Goals**

- The table data model (`id`, `name`, `comment`) and pure domain functions
  to create a table and edit its name/comment.
- An "Add Table" dialog that creates a table with a user-chosen name.
- The canvas renders one custom node per table, in a deterministic
  placeholder layout.
- Clicking a table node selects it; the side panel then shows and edits that
  table's name and comment inline.

**Non-Goals**

- Node `position` persistence and dragging (REQ-001's "drag") — deferred to
  a follow-up branch. Nodes render non-draggable for now. Fulfilled by
  [0005](0005-table-drag-and-position-persistence.md).
- Deleting a table (REQ-001's "delete") — deferred to the same follow-up
  branch, together with keyboard-Delete and an explicit delete button (both
  are wanted eventually; neither is built here).
- Columns and keys (REQ-010, REQ-011, REQ-013).
- Foreign-key relations and edges (REQ-014, REQ-015).
- Multi-select (REQ-004) — Phase 2.
- Table name uniqueness / integrity validation (REQ-018, REQ-023) — no
  per-dialect identifier rules or duplicate-name rejection yet; the zod
  schema only requires a non-empty name.

## Design

### Data model

`Table` is `{ id: string; name: string; comment: string }`, a zod schema
(`tableSchema`) mirroring `Schema`'s own style. Unlike `name` (`min(1)`),
`comment` has no minimum length — an empty comment is the normal case, not
an invalid one. `Schema.tables` widens from `z.array(z.never())` to
`z.array(tableSchema)`; the empty array already persisted by every existing
document still validates, so no migration is needed.

**No `position` field yet.** Storing a position nothing can currently change
would be speculative state. The canvas instead derives a deterministic
placeholder layout from each table's index in the array (see Canvas
below). The follow-up branch that adds drag adds `position: { x, y }` to
`Table` then, together with `onNodesChange`-driven persistence. This mirrors
0002's own precedent of leaving `repository.remove` out until 0003 actually
needed it.

### Table lifecycle functions

`src/domain/schema.ts` gains three pure functions alongside the existing
`createSchema`/`renameSchema`, same style (`{ now?: Date }` options for test
determinism, immutable copies, bump `Schema.updatedAt` since table content is
schema content):

- `createTable(schema, name, options?)` — appends `{ id, name, comment: "" }`.
- `renameTable(schema, tableId, name, options?)`
- `updateTableComment(schema, tableId, comment, options?)`

Both edit functions are a no-op (return the input schema unchanged) when
`tableId` doesn't match any table, so they're safe to call without a
workspace-layer guard duplicating that check. The separate "unchanged value
shouldn't dirty `updatedAt`" guard (mirroring `renameSchema`'s existing
`prev.name === name ? prev : renameSchema(...)` check) stays at the
`useSchemaWorkspace` callback layer, exactly where the equivalent schema-name
guard already lives — the domain layer only guards against a genuinely
missing target, not an unchanged value.

### Add Table dialog

A new, independent `TableNameDialog` component (`src/pages/MainScreen/
components/TableNameDialog/`) mirrors `SchemaNameDialog`'s internal
structure — the same `Dialog` + `dialogActionButton` primitives,
mount-only-while-open local form state, trimmed-name validation, submit
disabled while empty — but is not shared with it (see Alternatives
Considered). Clicking "Add Table" in the toolbar opens this dialog
(`ActiveDialogContext`'s `DialogKind` gains a `"createTable"` member); on
submit, the trimmed name creates a table via the workspace's `createTable`
callback and the dialog closes.

### Canvas: node rendering, layout, and selection

`Canvas` takes `tables: Table[]`, `selectedTableId: string | null`, and
`onSelectTable: (id: string | null) => void`.

- A new custom node type, `TableNode` (`components/Canvas/TableNode/`),
  renders a table's name and its comment when non-empty. It carries
  `role="button"`, `tabIndex={0}`, and an `aria-label` so it's queryable by
  role in tests and focusable for a future keyboard-Delete handler.
- `nodeTypes = { table: TableNode }` is a **module-level constant** — the
  first custom node type in this codebase, and defining it inline inside the
  component would make React Flow warn and remount nodes on every render.
- A private helper maps `Table[]` to React Flow `Node[]`: `{ id: table.id,
type: "table", position: <grid position from index>, data: { name,
comment }, selected: table.id === selectedTableId, draggable: false }`.
  Selection uses React Flow's own `node.selected` field rather than a custom
  `data.selected`, so `TableNode` reads it through the standard `NodeProps`
  contract.
- The grid layout (e.g. wrapping every few columns) is a placeholder — good
  enough since nothing can reposition a node yet — explicitly open to
  revision once the drag/persist branch lands.
- `<ReactFlow nodesDraggable={false} ...>` is one global flag rather than a
  per-node `draggable: false`, since no table is draggable in this scope.
- `onNodeClick` calls `onSelectTable(node.id)`; `onPaneClick` calls
  `onSelectTable(null)`. These are explicit handlers rather than React
  Flow's built-in multi-select machinery (`onSelectionChange`), since
  multi-select (REQ-004) is Phase 2 and depending on RF's selection state
  now would need to be partly undone later.

### Selection state ownership

Selection state (`selectedTableId`) lives as a plain `useState` in
`MainScreen`'s container component, next to the existing `isSidePanelOpen`,
and is cleared on schema switch. It flows two hops —
`MainScreenContent → MainScreenView → Canvas` / `→ SidePanel` — the same
depth every other schema-derived value (`schemaName`, `tableCount`,
`createdDate`) already travels via plain props today.

This is a deliberate contrast with `ActiveDialogContext` and
`NotificationContext`, both introduced because they have multiple disparate
producers/consumers scattered across the tree. Selection has exactly one
producer (Canvas clicks) and one consumer (SidePanel), both already siblings
under `MainScreenView`. Reaching for Context here would be adopting the
abstraction before a second real consumer forces it — the same "not yet"
judgment 0002 made about dialogs before 0003's second consumer appeared.

### Side panel: inline name/comment editing

When a table is selected, the side panel renders a form instead of its
current schema `<dl>`:

- **Comment** is a fully controlled `<textarea>` bound directly to
  `selectedTable.comment`; every `onChange` commits immediately. There's no
  cancel affordance to protect because `""` is always a valid comment —
  consistent with the app's auto-save-everywhere philosophy.
- **Name** needs a local buffer, because `name` has `min(1)` and a
  momentarily blank input must not commit an invalid document. The form is
  remounted via `key={selectedTable.id}` (the same "mount only while
  relevant, so state resets" trick `SchemaNameForm` already uses for dialog
  opens), seeding local state from `selectedTable.name`. `onChange` updates
  the buffer and commits via the workspace's `renameTable` only when the
  trimmed value is non-empty; `onBlur` reverts the buffer to
  `selectedTable.name` if it's still empty. This is the inline-editing
  analogue of the dialog's disabled-submit-while-empty guard, adapted to a
  UI with no submit button to disable.

## Alternatives Considered

- **Storing `position` now, even without drag** — rejected: a field nothing
  can change yet is speculative state with no consumer; deferring it costs
  nothing since adding a field later is not a breaking migration for an
  already-narrow `tables` array.
- **A `SelectedTableContext` for selection** — rejected: exactly one
  producer and one consumer, both already siblings at the same prop-drilling
  depth as other schema-derived data; Context here would preempt a second
  consumer that doesn't exist yet.
- **Generalizing `SchemaNameDialog` into a shared name dialog** (adding a
  `label` prop and reusing it for table creation) — rejected: schemas and
  tables are different domain concerns with independent evolution paths
  (e.g. table names may later need per-dialect identifier validation that
  schema names never will); a small amount of duplication between two
  independent dialogs is preferred over coupling their futures together.
- **Disabled-submit validation for the inline name field** (matching the
  dialog pattern exactly) — rejected: there's no submit button in an inline
  form; revert-on-blur achieves the same "never commit an empty name"
  guarantee without inventing one.

## Open Questions

- The grid placement algorithm is a placeholder; it's expected to be
  revisited once the drag-persistence branch adds real positions.
- Whether keyboard activation (Enter/Space) of a selected node needs
  explicit wiring, or whether React Flow's built-in node focus/interaction
  already covers it — to be verified during implementation.
- Confirm the future delete branch (keyboard Delete + an explicit delete
  button) needs no different shape for `selectedTableId`/node ids than what
  this doc builds — node id is already the table id, so it shouldn't.
