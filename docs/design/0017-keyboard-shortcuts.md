# Keyboard Shortcuts

- **Status**: Implemented
- **Created**: 2026-08-01
- **Updated**: 2026-08-11

## Context

Editing in this app is dialog- and canvas-selection-driven: destructive
actions go through a confirm dialog, and most edits go through a form
dialog. Users expect standard keyboard shortcuts for the highest-frequency
actions in that flow — delete, undo/redo, and confirming or cancelling a
dialog — rather than having to reach for the mouse every time.

These shortcuts were built incrementally across the REQ-004 (multi-select)
and REQ-005 (undo/redo) changes, without being tracked as their own
requirement item. This doc documents the shortcut system as it exists today
and closes out REQ-031, which had no design doc link.

## Goals / Non-Goals

**Goals**

- Delete/Backspace deletes the current table or relation selection, via the
  same confirm dialog as the side panel's delete button.
- Ctrl/Cmd+Z undoes the last diagram edit; Ctrl/Cmd+Shift+Z redoes it.
- Escape cancels whichever dialog is open.
- Enter confirms a dialog: submits a form dialog, or activates the
  autofocused action button in a confirm dialog.
- None of the above fire while a dialog is already open (for delete/undo/
  redo) or while focus is in a text input, textarea, or select (for all of
  them) — so shortcuts never fight a dialog's own form state or native
  in-field editing (e.g. browser undo inside a text field).

**Non-Goals**

- Select-all (Ctrl/Cmd+A) on the canvas.
- A shortcuts help/cheat-sheet overlay.
- Any shortcut beyond the four above (Escape-clears-selection is covered
  separately in [0032](0032-escape-clears-canvas-selection.md)) — REQ-031's
  "..." is intentionally left
  open for future additions, not implied to already exist.

## Design

### Shared guard

`src/pages/MainScreen/hooks/keyboardShortcutGuards.ts` exports
`isTextInputElement`, used by every shortcut hook to ignore keystrokes when
`document.activeElement` is an `HTMLInputElement`, `HTMLTextAreaElement`, or
`HTMLSelectElement`.

### Delete/Backspace

`src/pages/MainScreen/hooks/useDeleteKeyShortcut.ts` listens on `window` for
`Delete`/`Backspace`. It no-ops if a dialog is already open, if focus is in
a text input, or if nothing is selected. Otherwise it opens
`"deleteTable"` or `"deleteRelation"` (via `ActiveDialogContext`) depending
on which kind of selection is active — table and relation selection are
mutually exclusive, so the target dialog is unambiguous. This mirrors the
side panel's own delete button: the shortcut never deletes immediately, it
only opens the same confirmation dialog.

### Undo/redo

`src/pages/MainScreen/hooks/useUndoRedoShortcut.ts` listens on `window` for
Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z (redo), backed by `useUndoRedo`. It
no-ops under the same two conditions as delete (dialog open, or focus in a
text field), plus it checks `canUndo`/`canRedo` before acting.

Both hooks are wired up once in `MainScreen`, reading the current selection
and dialog state from the same page-scoped contexts the rest of the page
already uses (`ActiveDialogContext`, the selection context) — see
[0011](0011-main-screen-state-composition.md) and
[0016](0016-undo-redo.md).

### Cancel (Escape)

`src/components/parts/Dialog/Dialog.tsx` owns Escape handling directly: the
`DialogPanel` mounted while a dialog is open attaches a `keydown` listener
on `document` and calls the dialog's `onClose` on `Escape`. Every dialog in
the app (`ConfirmDialog`, `TableNameDialog`, `SchemaNameDialog`,
`ColumnDialog`, `KeyDialog`, `ExportSqlDialog`) is built on top of `Dialog`,
so Escape-to-cancel is automatic for any new dialog without extra wiring.
The listener is only attached while the dialog is mounted, so it can't fire
when no dialog is open.

### Confirm (Enter)

There is no custom Enter handling, by design:

- The text-input dialogs (`TableNameDialog`, `SchemaNameDialog`,
  `ColumnDialog`, `KeyDialog`) wrap their fields in a native `<form
onSubmit={...}>` with a `type="submit"` button, so pressing Enter in any
  field submits the form the same way clicking the button would.
- `ConfirmDialog` has no text field to type into; its confirm button carries
  `data-autofocus`, which `Dialog` focuses on mount. A focused `<button>`
  activates on Enter per native HTML semantics, so no extra code is needed
  there either.

### Test coverage

Coverage already exists per-piece rather than as one shortcuts test suite:

- `keyboardShortcutGuards.test.ts` — the shared guard.
- `useDeleteKeyShortcut.test.tsx`, `useUndoRedoShortcut.test.tsx` — hook
  behavior, including the dialog-open/text-field guards.
- `Dialog.test.tsx` — the generic Escape-to-close behavior.
- Each dialog's own test file has a "calls onCancel when Escape is pressed"
  case, and separate cases that submit the form/click the confirm button.

## Alternatives Considered

- **A single `useKeyboardShortcuts` hook covering delete, undo/redo, and
  dialog cancel** — rejected: dialog cancel is inherently per-dialog-instance
  state (`DialogPanel` is only mounted while its dialog is open), so folding
  it into a page-level hook would need to reintroduce the open/closed state
  `Dialog` already tracks. Keeping Escape inside `Dialog` also means every
  new dialog gets cancel-on-Escape for free.
- **Custom `keydown` handling for Enter-to-confirm** — rejected: native
  `<form>` submission and focused-button activation already provide this
  with zero code, and duplicating it would risk double-submits or fighting
  the browser's own handling.

## Open Questions

- ~~Should Escape also clear the current canvas selection when no dialog is
  open? Left as a Non-Goal here; would be a small, separate addition if
  wanted.~~ Resolved in
  [0032](0032-escape-clears-canvas-selection.md): a new
  `useEscapeClearSelectionShortcut` hook clears the canvas selection on
  Escape, under the same dialog-open/text-field guards as the other
  shortcuts.
