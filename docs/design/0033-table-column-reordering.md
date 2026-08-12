# Table Column Reordering

- **Status**: Implemented
- **Created**: 2026-08-12
- **Updated**: 2026-08-12

## Context

REQ-010 in [requirements.md](../requirements.md) covers "add, edit, remove,
and reorder columns," but [0006](0006-table-column-management.md) explicitly
deferred reordering as a Non-Goal, leaving REQ-010 only partially fulfilled:

> Column reordering (REQ-010's "reorder") — not requested for this
> iteration; deferred to a follow-up doc alongside auto-increment.

Auto-increment was later covered by REQ-033 ([0007](0007-table-key-management.md)),
but the column-reordering half was never picked back up.
[0031](0031-composite-key-column-ordering.md) recently shipped the sibling
feature — reordering columns _within a composite key_ — and explicitly
called out that it does not touch this gap. This doc closes it: reordering a
table's own columns, as listed in `SidePanel` and rendered on the canvas
node.

## Goals / Non-Goals

**Goals**

- Let the user reorder a table's columns from the side panel.
- Persist the new order in the schema (and undo history) immediately on
  each move — no separate confirm step.

**Non-Goals**

- Drag-and-drop reordering — see Alternatives Considered.
- Any change to composite key column order — already handled by 0031 and
  unrelated; `Key.columnIds` is independent of `Table.columns`' order.
- Any change to how columns are rendered on the canvas node beyond
  reflecting the new order (they already render in `table.columns` order).

## Design

### `moveColumnUp`/`moveColumnDown` domain functions

`src/domain/schema/column.ts` gains `moveColumnUp(schema, tableId, columnId, options?)`
and `moveColumnDown(schema, tableId, columnId, options?)`, alongside the
existing `addColumn`/`updateColumn`/`removeColumn`. Each locates the table,
swaps the target column with its neighbor in `table.columns` (an ordered
`Column[]`), and returns `schema` unchanged (same reference) when the table
or column doesn't exist, or the column is already at the corresponding
boundary. `updatedAt` is only bumped when a swap actually happened. Kept in
the domain layer (not as dialog-local state like 0031's
`moveColumnId.ts`) because there is no dialog here — a column-list row swap
must commit straight to the schema.

### Undo-aware action layer

`useUndoableSchema.ts` adds `moveColumnUp`/`moveColumnDown` actions, each a
thin `commitEdit((prev) => moveColumnUp(prev, tableId, columnId))` wrapper,
matching `removeColumn`'s existing entry. Because the domain functions
return the same reference on a no-op, boundary clicks don't create spurious
undo entries — the same guarantee `removeColumn`/`addKey`/etc. already rely
on via the reducer's `next !== state.currentSchema` check.

### `SidePanel` UI

Each column row in the columns `<ul>` gains "move up"/"move down" icon
buttons (`LuChevronUp`/`LuChevronDown` from `react-icons/lu`, matching
0031's precedent and `SidePanel`'s existing local `iconButton` pattern),
disabled at the first/last row respectively. Buttons call
`onMoveColumnUp(column.id)`/`onMoveColumnDown(column.id)` directly — no
dialog, mirroring `onUpdateTableName`'s direct-commit wiring rather than
`onDeleteColumn`'s dialog-routed one, since a reorder needs no confirmation.

### i18n

`sidePanel.moveColumnUpAriaLabel`/`moveColumnDownAriaLabel` are added to
both locale message files, ICU-interpolated with `{name}` (the column's
name), following the existing `editColumnAriaLabel`/`deleteColumnAriaLabel`
`{name}`-interpolation precedent in the same block.

## Alternatives Considered

- **Drag-and-drop reordering** — rejected for the same reason as 0031: no
  drag/sort library is a dependency of this codebase, and up/down buttons
  already cover the equivalent need elsewhere (composite key columns) with
  a consistent, low-cost UI convention.
- **Reusing `KeyDialog`'s `moveColumnId.ts` helper directly** — rejected:
  it operates on `string[]` (column ids only) for dialog-local draft state;
  here the swap must happen on `Table.columns` (`Column[]`) and commit
  immediately to the schema, so a new pair of domain functions is a better
  fit than adapting dialog-local logic.

## Open Questions

- None.
