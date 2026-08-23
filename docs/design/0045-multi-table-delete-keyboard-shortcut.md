# Multi-Table Delete Keyboard Shortcut

- **Status**: Implemented
- **Created**: 2026-08-23
- **Updated**: 2026-08-23

## Context

[0015](0015-multi-select-and-group-move.md) added multi-table selection, but
`useDeleteKeyShortcut` only ever read the single-selection `tableId` (`null`
whenever 0 or 2+ tables are selected — see `SelectionContext`'s derivation).
Concretely: selecting two or more tables on the canvas and pressing
Delete/Backspace did nothing, even though the same keypress deletes a single
selected table. [0044](0044-side-panel-multiple-selection-count.md), which
added the side panel's "N tables selected" affordance, explicitly flagged
this gap as a follow-up candidate rather than fixing it in scope.

## Goals / Non-Goals

**Goals**

- Delete/Backspace opens the same confirmation dialog for a 2+ table
  selection as it already does for a single table, and confirming removes
  every selected table in one step.
- The dialog's title and message distinguish the single- and multi-table
  cases so the count is visible before confirming.

**Non-Goals**

- A bulk-delete entry point in the side panel itself — the panel still shows
  only the "N tables selected" heading for a multi-selection (0044's own
  Non-Goal); this doc only wires the existing keyboard shortcut through.
- Any other bulk action (rename, add column/key) on a multi-selection.

## Design

### Domain layer

`removeTables(schema, tableIds, options)` is added to
`src/domain/schema/table.ts`, mirroring `moveTables`'s existing batch
pattern next to the single-id `removeTable`: it filters out every table
whose id is in the batch, strips foreign keys on the remaining tables that
referenced any removed table, and bumps `updatedAt` once. A no-op (no id in
the batch matches an existing table) returns the input schema unchanged, the
same identity-stability contract `removeTable`/`moveTables` already have.

### Action wiring

`removeTables: (tableIds: string[]) => void` is added to `SchemaActions`
(`useSchemaWorkspace.ts`) and implemented in `useUndoableSchema.ts` as a
single `commitEdit` call — one undo/redo step removes every table in the
batch, consistent with `moveTables`'s single-step group move.

### Shortcut and dialog

`useDeleteKeyShortcut`'s selection shape changes from `tableId: string | null`
to `hasTableSelection: boolean`, since the hook only needs to know whether
_some_ table is selected (one or many) to decide whether to open the
`deleteTable` dialog — `MainScreenView` now passes
`selectedTableIds.size > 0`. `DialogHost` reads `selectedTableIds` from
`SelectionContext` directly (already available there) to branch the
`deleteTable` `ConfirmDialog`: `size >= 2` shows a new
`tableDialog.deleteTitleMultiple` / `deleteConfirmMessageMultiple` (ICU
`{count}`) pair and calls `removeTables([...selectedTableIds])` on confirm;
otherwise the existing single-table title/message and `removeTable` call are
unchanged.

No explicit selection-clearing is needed after a multi-delete: as with the
existing single-table path, Canvas's own `onSelectionChange` echoes the
post-removal React Flow selection (now empty) back into `SelectionContext`
once the deleted nodes are gone.

## Alternatives Considered

- **Looping `removeTable` once per selected id from `DialogHost`** —
  rejected: produces one undo/redo history entry per table instead of one
  for the whole batch, inconsistent with how `moveTables` already treats a
  multi-table drag as a single undo step.
- **Keeping `useDeleteKeyShortcut`'s parameter as `tableId` and deriving
  `hasTableSelection` inside the hook from a new `tableIds` param** —
  rejected: the hook never needed the actual id(s), only whether to open the
  dialog at all; a plain `boolean` is the smaller interface, and
  `DialogHost` already had `selectedTableIds` on hand for the real ids.

## Open Questions

- **No new E2E spec was added for this change**, decided deliberately rather
  than overlooked: `e2e/specs/table-deletion.spec.ts`
  ([0027](0027-e2e-testing-with-playwright.md)) already exercises the
  real-browser-only risk on this path — the `window` `keydown` listener
  racing React Flow's own `deleteKeyCode: null` override — for the
  single-table case, and this change reuses that exact same listener and
  `ConfirmDialog`/`removeTable(s)` plumbing unchanged; it only adds a branch
  inside `DialogHost` on `selectedTableIds.size` once the dialog is already
  open. The one genuinely new surface — actually producing a 2+ table
  selection via shift-click or rubber-band in a real browser — is
  `docs/rules/testing.md`'s own stated Non-Goal ("keyboard-shortcut ...
  coverage (no app-specific risk)"), so it's covered instead by seeding
  `SelectionContext` directly via `initialSelection` in
  `MainScreenView.test.tsx` (real `Canvas`/`DialogHost`, seeded selection
  state) plus the `removeTables`/`DialogHost` unit and story coverage. A
  manual `chrome-devtools-mcp` session confirmed the single-table path is
  unaffected; reproducing a real multi-select gesture through synthetic
  DOM events did not work reliably enough to script as a repeatable check,
  consistent with why testing.md excludes this class of interaction.
