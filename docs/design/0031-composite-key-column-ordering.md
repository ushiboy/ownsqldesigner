# Composite Key Column Ordering

- **Status**: Implemented
- **Created**: 2026-08-11
- **Updated**: 2026-08-11

## Context

[0007](0007-table-key-management.md) left an Open Question:

> Whether composite key column order (e.g. for a multi-column INDEX, where
> order can matter for query planning) needs to be user-controllable, given
> the checkbox UI naturally orders by the table's column order — left
> unresolved; revisit once SQL export (REQ-026) needs a concrete column
> order for `CREATE INDEX`.

REQ-026 has since shipped, and SQL export already fully respects
`Key.columnIds`'s array order — `generateDdl.ts`'s `columnNamesFor` maps
`columnIds` straight through, proven by the existing
`"renders a composite PRIMARY KEY with columns in stored order"` test. The
domain layer (`addKey`/`updateKey` in `src/domain/schema/key.ts`) is also
already order-preserving; `Key.columnIds` is a plain ordered array, not a
Set.

The actual gap turned out to be narrower than the open question implied: it
is entirely inside `KeyDialog`. `toggleColumn` appends a newly-checked
column id to the _end_ of `columnIds` (click order), not table order, and
once two or more columns were checked there was no way to see or change
that order — it was accidental, not controllable. This doc closes that gap.

## Goals / Non-Goals

**Goals**

- Let the user see the current column order for a composite key while
  adding/editing it in `KeyDialog`.
- Let the user reorder the checked columns explicitly.
- Keep SQL export and the domain layer unchanged — both already honor
  `columnIds` order correctly.

**Non-Goals**

- Column reordering within a table (REQ-010's "reorder columns") — a
  separate, still-unimplemented requirement with no relation to key column
  order beyond sharing the word "reorder."
- Drag-and-drop reordering — see Alternatives Considered.
- Changing how checking/unchecking a column affects `columnIds` (append on
  check, filter on uncheck) — unchanged; only the checked subset's order
  becomes user-controllable.

## Design

### `moveColumnIdUp`/`moveColumnIdDown`, pure reorder helpers

`src/pages/MainScreen/components/KeyDialog/moveColumnId.ts` exports
`moveColumnIdUp(columnIds, columnId)` and `moveColumnIdDown(columnIds, columnId)`,
each swapping the id with its neighbor and no-oping at the corresponding
boundary or when the id isn't present. Both delegate to a private
`moveColumnId(columnIds, columnId, direction)` that holds the shared swap
logic. Kept as small pure functions per
[component-design.md](../rules/component-design.md)'s "start simple"
guidance, rather than folded into `KeyForm`'s state logic, so they can be
unit tested directly.

### `KeyForm` UI

Each checkbox row in the columns `<fieldset>` now also shows, only for
_checked_ columns once two or more are checked:

- The column's 1-based position in `columnIds`.
- "Move up" / "move down" icon buttons (`LuChevronUp`/`LuChevronDown` from
  `react-icons/lu`, matching `SidePanel.tsx`'s existing local `iconButton`
  pattern — no shared icon-button component exists in this codebase yet),
  disabled at the first/last position respectively.

Clicking a move button calls `setColumnIds` with `moveColumnId`'s result.
Unchecked columns, and the case where fewer than two columns are checked,
render exactly as before (plain checkbox, no position, no buttons) — a
single checked column has nothing to reorder against.

### i18n

`keyDialog.moveColumnUp`/`moveColumnDown` were added to both locale message
files, ICU-interpolated with `{column}` (the column's name), following the
existing `keyDialog.deleteConfirmMessage`-style `{label}` interpolation
precedent.

## Alternatives Considered

- **Drag-and-drop reordering** — rejected: no drag/sort library is a
  dependency of this codebase, and no reordering UI of any kind exists
  elsewhere to extend (REQ-010's column reordering was deferred and never
  built). Introducing a new dependency for a two-to-a-handful-of-items list
  is disproportionate; up/down buttons cover the same need with the
  existing icon-button convention.
- **A separate "selected columns, in order" list distinct from the
  checkbox list** (a two-pane shuttle UI) — rejected: a bigger UI change
  than the problem needs; annotating the existing checkbox rows in place
  keeps the diff small and keeps table-order and selection-order
  visible together.

## Open Questions

- None.
