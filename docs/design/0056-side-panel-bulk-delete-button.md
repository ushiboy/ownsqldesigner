# Side Panel Bulk Delete Button

- **Status**: Implemented
- **Created**: 2026-08-30
- **Updated**: 2026-08-30

## Context

[0045](0045-multi-table-delete-keyboard-shortcut.md) wired Delete/Backspace
to remove a 2+ table selection in one step, but explicitly left the side
panel's `MultipleTablesSelected` view unchanged (its own stated Non-Goal).
The only way to bulk-delete tables was therefore a keyboard shortcut with
no on-screen affordance — a user who doesn't already know the single-table
delete icon exists (in `TableProperties`, next to the "Table" heading) has
no way to discover the multi-table equivalent at all.

## Goals / Non-Goals

**Goals**

- Add a visible "Delete Selected Tables" button to the side panel's
  `MultipleTablesSelected` view (shown once 2+ tables are selected) as a
  discoverable entry point for the existing bulk-delete flow.
- Reuse the existing `deleteTable` confirmation dialog unchanged — it
  already branches on `selectedTableIds.size >= 2` (0045) — by wiring the
  new button through the same `openDialog("deleteTable")` call the
  keyboard shortcut and single-table delete button both already use.

**Non-Goals**

- Any other bulk action (rename, add column/key) on a multi-selection —
  unchanged from 0045's own stated Non-Goal; this doc only adds a delete
  entry point.
- Changing `DialogHost`'s dialog branching, `removeTables`, or the
  keyboard shortcut — all already correct for this case since 0045.

## Design

`MultipleTablesSelected` gains a new `onDeleteTables: () => void` prop and
renders a labeled button below its heading, styled with the same
`sectionActionButton` `tv()` variant already used by "Add Column"/"Add Key"
in `TableProperties`. A bare icon-only button (like the single-table
delete's `iconButton`) was rejected: that pattern relies on sitting next to
a "Table" heading that already names the entity being acted on, and
`MultipleTablesSelected` has no equivalent context — an icon alone would
just reproduce the discoverability gap this doc exists to close.
`sectionActionButton`'s declaration moves up into the file's top-level
constants block since it is now shared by two components instead of one.

`SidePanel`'s existing `onDeleteTable` prop is left untouched; the new
`onDeleteTables` prop is wired in `MainScreenView.tsx` identically —
`onDeleteTables={() => openDialog("deleteTable")}` — reusing the exact
same dialog kind the single-table path and 0045's keyboard shortcut both
open. `DialogHost` needs no change: it already reads `selectedTableIds`
from `SelectionContext` directly rather than from a prop, so it has no way
to distinguish which UI entry point triggered `openDialog`.

A new `sidePanel.deleteSelectedTables` i18n message ("Delete Selected
Tables") is added for the button's visible label; no new `tableDialog`
strings are needed since `deleteTitleMultiple`/`deleteConfirmMessageMultiple`
(0045) already cover the confirmation dialog.

## Alternatives Considered

- **Icon-only button matching `TableProperties`' single-table delete** —
  rejected: relies on sitting next to a heading that already names the
  entity, which `MultipleTablesSelected` lacks; would reproduce the same
  discoverability gap this doc sets out to fix.
- **A new dialog kind or dedicated `tableDialog` strings for this button**
  — rejected: 0045 already made `deleteTable`'s `ConfirmDialog` branch
  correctly on selection size; a parallel path would duplicate logic
  without changing behavior.

## References

- [0045 — Multi-Table Delete Keyboard Shortcut](0045-multi-table-delete-keyboard-shortcut.md)
- [0044 — Side Panel: Multiple-Selection Count Affordance](0044-side-panel-multiple-selection-count.md)
