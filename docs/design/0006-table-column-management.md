# Table Column Management

- **Status**: Implemented
- **Created**: 2026-07-21
- **Updated**: 2026-07-21

## Context

`Table` (`src/domain/schema.ts`) has had no `columns` field at all since it was introduced: [0004](0004-table-creation-and-placement.md) explicitly deferred "Columns and keys (REQ-010, REQ-011, REQ-013)" as a Non-Goal, and no `Column` concept has existed anywhere in the codebase since.

This doc adds the column data model and wires add/edit/delete end to end: a dialog-based form for creating/editing a column, a list of a table's columns in the side panel with edit/delete affordances, and the column names rendered on the table's canvas node. It follows the same incremental-delivery shape as 0004 → [0005](0005-table-drag-and-position-persistence.md) (table creation/placement shipped first, drag/position followed): this doc intentionally does **not** cover column reordering or auto-increment, so REQ-010 is only partially fulfilled here — a follow-up doc is expected to complete it, the same way REQ-001 was split across 0004 and 0005.

## Goals / Non-Goals

**Goals**

- A `Column` data model (`id`, `name`, `type`, `size`, `defaultValue`, `nullable`, `comment`) and pure domain functions `addColumn`, `updateColumn`, `removeColumn` in `src/domain/schema.ts`.
- An "Add Column" / "Edit Column" dialog (`ColumnDialog`) covering all fields above, opened from the side panel.
- The side panel's table-properties view lists the selected table's columns with per-row Edit/Delete icon buttons.
- Deleting a column reuses the existing generic `ConfirmDialog`.
- The canvas `TableNode` renders each column's name as a row below the table name/comment — the actual visual payoff of the feature, not deferred alongside REQ-012.

**Non-Goals**

- Column reordering (REQ-010's "reorder") — not requested for this iteration; deferred to a follow-up doc alongside auto-increment.
- Auto-increment (REQ-010, REQ-033) — REQ-033 ties its validity to a PRIMARY KEY, and REQ-013 (keys) doesn't exist yet, so there is nothing to validate against; deferred until keys exist.
- Keys and foreign-key relations (REQ-013–REQ-017, REQ-020, REQ-022).
- Column name uniqueness within a table and SQL-identifier validation (REQ-018, REQ-019) — same deferral precedent as table names in 0004; only non-empty is enforced.
- Toggling type/size display on the canvas (REQ-012, Phase 3) — column names always render; type/size stay side-panel-only.
- Multi-dialect type sets — the column `type` enum is hardcoded to SQLite's storage classes (`INTEGER`, `TEXT`, `REAL`, `BLOB`, `NUMERIC`); generalizing "per-dialect" is deferred until a second dialect is actually added.

## Design

### Data model

`Table` gains a required `columns: Column[]` field (same "not yet released, no migration needed" reasoning 0005 used for adding `position`). `createTable` initializes `columns: []`.

`Column` is a new zod schema: `{ id, name, type, size, defaultValue, nullable, comment }`. `type` is `z.enum(SQLITE_COLUMN_TYPES)`, a new exported constant (`["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"]`) — SQLite's storage classes. `size` and `defaultValue` are plain, unenforced strings (`""` means unset); SQLite doesn't enforce either, but they're kept for documentation and future dialects.

Three new pure functions in `schema.ts`, placed after `moveTable` and before the private `defaultTablePosition` helper:

- `addColumn(schema, tableId, fields, options?)` — appends a column with a generated id. No-op if `tableId` doesn't match any table.
- `updateColumn(schema, tableId, columnId, fields, options?)` — replaces all editable fields of the matching column at once (the dialog submits the whole form together, unlike table rename/comment's single-field inline edits). No-op if the table or column isn't found.
- `removeColumn(schema, tableId, columnId, options?)` — filters the column out. No-op if the table or column isn't found.

All three bump `schema.updatedAt`, same as every other table-content mutation.

### Workspace callbacks

`useSchemaWorkspace.ts` adds `addColumn`, `updateColumn`, `removeColumn` callbacks with the same `dismissNotification()` + `setCurrentSchema` shape as every other mutation. Unlike `renameTable`/`updateTableComment`, none of the three add an "unchanged value" equality guard — they're discrete dialog-submit/button-click actions, not continuous per-keystroke commits, matching `createTable`'s existing guard-free shape.

### Selected column state

A new `selectedColumnId: string | null` lives in `MainScreen`'s container state, next to the existing `selectedTableId` — same justification 0004 gave for keeping `selectedTableId` as plain `useState` instead of Context (one producer, one consumer, both already siblings at the same prop-drilling depth). It resets to `null` whenever `selectedTableId` changes. The container derives `selectedColumn = selectedTable?.columns.find(...) ?? null` and threads it down exactly like `selectedTable` already is.

This is not treated as a final decision: if implementation experience shows the prop chain getting unwieldy, switching `selectedColumnId` to a Context later is an acceptable revision (see Open Questions).

### `ActiveDialogContext`

`DialogKind` gains `"addColumn" | "editColumn" | "deleteColumn"`.

### `ColumnDialog` (new, `src/pages/MainScreen/components/ColumnDialog/`)

Mirrors `TableNameDialog`'s two-part shape: a thin outer `ColumnDialog` forwarding to the shared `Dialog`, and an inner `ColumnForm` mounted only while open (so state resets each open), holding local state for all six fields — seeded from `initialColumn` when editing, or blank defaults when adding (`type` defaults to `"TEXT"`, `nullable` defaults to `true`). Submit is disabled while the trimmed name is empty. Fields: text input (name), `<select>` populated from `SQLITE_COLUMN_TYPES` (type), text input (size), text input (default value), checkbox (nullable), textarea (comment).

`MainScreenView` (which already calls `useActiveDialog()` for every other dialog) composes selection + dialog-open together for the three new entry points (`onAddColumn`, `onEditColumn(columnId)`, `onDeleteColumn(columnId)` passed to `SidePanel`), then renders the three new dialogs at the bottom alongside the existing ones, gated by `activeDialog`.

### Side panel: column list

`TableProperties` (inside `SidePanel.tsx`) gains a "Columns" section below the existing Name/Comment fields: a list of `table.columns` (name + type), each row with two icon-only buttons (`LuPencil`/`LuTrash2` from `react-icons/lu`, `aria-label` including the column name for disambiguation across rows) styled with a small locally-defined `iconButton` tv() — no shared/exported icon-button component exists yet in this codebase (`Toolbar.tsx` and `SchemaMenu.tsx` each already keep their own local `tv()` rather than sharing one). An "Add Column" button (icon + text) sits above the list.

### Canvas: column rows on `TableNode`

`TableNodeData` widens to include `columns: { id: string; name: string }[]`. `TableNode.tsx` renders a `<ul>` of column-name rows below the comment (only when non-empty, with a top border separating it from the header). `Canvas.tsx`'s private `tablesToNodes` mapper threads `table.columns.map(({ id, name }) => ({ id, name }))` into the node data.

## Alternatives Considered

- **Per-field inline column editing in the side panel** (matching table name/comment's pattern) — rejected: a column has ~6 fields, too many for a comfortable inline row; a dialog scales better and mirrors `TableNameDialog` precedent.
- **A `SelectedColumnContext`** — rejected for the same reason 0004 rejected `SelectedTableContext`: exactly one producer, one consumer, both already siblings at the existing prop-drilling depth. Not final — see Open Questions.
- **Shipping auto-increment now as an unvalidated boolean** — rejected: it would be a checkbox with no enforceable meaning until PRIMARY KEY exists, inviting a later breaking UX change once REQ-013 lands.
- **Keeping the canvas node name/comment-only, columns side-panel-only** — rejected: showing columns on the node is the actual visual point of the feature, not an optional enhancement.
- **A generic reusable icon-button component** (extracting `Toolbar.tsx`'s `toolButton` into `src/components/parts/`) — deferred: no such shared component exists yet and this doc doesn't want to take on that refactor as a side effect; the new side-panel buttons duplicate the small `tv()` locally, same as `Toolbar.tsx`/`SchemaMenu.tsx` already do independently of each other.

## Open Questions

- The placeholder grid layout (`GRID_CELL_HEIGHT = 160` in `schema.ts`) was sized for a name+comment-only card; a table with several columns will likely visually overflow its cell in the default grid position. Since tables are already draggable (0005), this is a cosmetic issue the user can fix by dragging, not a blocker — left as-is, open to revision if it proves annoying in practice.
- Whether `size`/`defaultValue` should have any per-type constraints (e.g. disabling `size` for `BLOB`) is left unresolved; both are plain free-form text fields for now.
- `selectedColumnId` starts as plain `useState` + prop drilling (see Alternatives Considered), but this may be revisited and switched to a Context depending on how implementation actually feels — not treated as a settled decision.
