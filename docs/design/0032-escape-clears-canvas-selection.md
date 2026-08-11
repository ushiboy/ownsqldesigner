# Escape Clears Canvas Selection

- **Status**: Implemented
- **Created**: 2026-08-11
- **Updated**: 2026-08-11

## Context

[0017](0017-keyboard-shortcuts.md) left an Open Question:

> Should Escape also clear the current canvas selection when no dialog is
> open? Left as a Non-Goal here; would be a small, separate addition if
> wanted.

There is no functional gap or bug motivating this — it's a small UX
convenience pass, picked from that doc's open list as the next well-scoped
piece of work now that all of `docs/requirements.md`'s current items are
implemented. Escape already cancels an open dialog (`Dialog.tsx`); with no
dialog open, pressing Escape currently does nothing, even though a table,
column, key, or relation may be selected on the canvas.

## Goals / Non-Goals

**Goals**

- Pressing Escape with no dialog open and focus outside a text field clears
  the current canvas selection (table(s), column, key, or relation).
- Follows the same guard rules as the existing delete/undo/redo shortcuts:
  ignored while a dialog is open, and ignored while focus is in a text
  input, textarea, or select.
- No-ops when nothing is selected, mirroring `useDeleteKeyShortcut`'s
  no-op-when-nothing-selected behavior.

**Non-Goals**

- Any change to Escape's existing dialog-cancel behavior — that stays
  entirely inside `Dialog.tsx` and fires first (a dialog being open is a
  guard condition for this new behavior, not something it competes with).
- A shortcuts help/cheat-sheet overlay (still out of scope, per 0017).

## Design

### `useEscapeClearSelectionShortcut`

`src/pages/MainScreen/hooks/useEscapeClearSelectionShortcut.ts` follows the
same shape as `useDeleteKeyShortcut`/`useUndoRedoShortcut`: a window-level
`keydown` listener registered in a `useEffect`, guarded by
`useActiveDialog()`'s `activeDialog !== null` and the shared
`isTextInputElement` guard from `keyboardShortcutGuards.ts`. On `Escape`, it
calls `clearSelection()` from `SelectionContext` — the same function
undo/redo history jumps already use (see [0016](0016-undo-redo.md)) — which
unconditionally drops the table, column, key, and relation selection
together.

It is a separate hook from `useDeleteKeyShortcut` rather than folded into
it: that hook's no-op guard and target dialog selection are specific to
deletion, and keeping one hook per shortcut concern matches the existing
delete/undo-redo split.

### Wiring

Called in `MainScreenView.tsx` alongside `useDeleteKeyShortcut` and
`useUndoRedoShortcut`, reading `selectedTableIds`, `selectedColumnId`,
`selectedKeyId`, `selectedRelationId`, and `clearSelection` from
`useSelection()`.

## Alternatives Considered

- **Fold into `useDeleteKeyShortcut`** — rejected: that hook's name and
  no-op condition are delete-specific; a combined hook would need an
  unrelated second responsibility and a less accurate name.

## Open Questions

- None.
