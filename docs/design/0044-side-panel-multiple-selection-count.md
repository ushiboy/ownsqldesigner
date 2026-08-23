# Side Panel: Multiple-Selection Count Affordance

- **Status**: Implemented
- **Created**: 2026-08-22
- **Updated**: 2026-08-22

## Context

[0015](0015-multi-select-and-group-move.md) added multi-table selection
(shift-click accumulate, rubber-band box-select) but deliberately left the
side panel and single-table dialogs untouched: `selectedTableId` is derived
as the sole id only when exactly one table is selected, `null` otherwise, so
2+ selected tables read identically to "nothing selected" everywhere that
already branched on `selectedTableId === null`. 0015's Open Questions
flagged this: "Whether a 'N tables selected' side-panel affordance
(distinguishing multi-selected from empty) is worth adding as a small
follow-up polish."

Concretely, selecting 2+ tables on the canvas left the side panel showing
the same schema-summary view (name/dialect/table count/created date) as no
selection at all, giving no indication that a multi-selection was active.

## Goals / Non-Goals

**Goals**

- When 2 or more tables are selected, `SidePanel` shows a distinct "N
  tables selected" heading instead of the schema summary.
- Exactly one selected table keeps showing the existing single-table
  `TableProperties` view, unchanged.

**Non-Goals**

- Any bulk action (rename, delete, add column/key) operating on the
  multi-selection — still out of scope per 0015's own Non-Goals.
- ~~Keyboard Delete acting on a multi-selection — `useDeleteKeyShortcut`
  still ignores selection whenever `selectedTableId` is `null`. Left as a
  separate follow-up candidate.~~ Resolved by
  [0045](0045-multi-table-delete-keyboard-shortcut.md).

## Design

`SidePanel` gains a required `selectedTableCount: number` prop. When
`selectedTable` is `null`, the panel now branches on `selectedTableCount`:
`>= 2` renders a new private `MultipleTablesSelected` component (an `<h2>`
heading using a new i18n key, `sidePanel.multipleTablesSelectedHeading`,
with an ICU `{count}` placeholder); otherwise it renders the existing
`SchemaSummary`. `selectedTable === null` already implies 0 or 2+ selected
(0015's derivation guarantees `selectedTableId`, and therefore
`selectedTable`, is non-null only for exactly one selection), so no new
selected-count-1 case needs handling here.

`MainScreenView` passes `selectedTableIds.size` (already read from
`useSelection()` for other purposes) straight through as the new prop — no
new state.

## Alternatives Considered

- **Deriving the count inside `SidePanel` from a `tables`/id-set prop** —
  rejected: `MainScreenView` already has `selectedTableIds.size` on hand: a
  plain `number` prop is the smaller interface and keeps `SidePanel` a pure
  function of precomputed values, consistent with how it already receives
  `tableCount` rather than a table list.
- **A single `selectionCount` prop replacing both `selectedTable` and the
  new count** — rejected: `selectedTable` already carries the full `Table`
  needed for the single-selection view; reintroducing a lookup inside
  `SidePanel` would duplicate the derivation `MainScreenView`/`MainScreen`
  already perform.

## References

- [0015 — Multi-select and Group Move](0015-multi-select-and-group-move.md)
  (Open Questions — this doc resolves the second bullet)
