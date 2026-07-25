# Table Deletion

- **Status**: Implemented
- **Created**: 2026-07-25
- **Updated**: 2026-07-25

## Context

REQ-001 covers "place, drag, and delete table nodes." [0004](0004-table-creation-and-placement.md)
built placement and deferred delete "to the same follow-up branch" as drag;
[0005](0005-table-drag-and-position-persistence.md) built drag and deferred
delete again ("still out of scope"). No follow-up ever landed: there is no
`removeTable` domain function, no delete UI, and no keyboard handling for it
anywhere in the codebase today.

[0007](0007-table-key-management.md) names foreign-key relations as the next
feature, and one of that feature's core rules (REQ-021, "deleting a table or
column never leaves dangling relations") can't be exercised end-to-end
without table deletion existing first. This doc closes that gap on its own,
so the FK-relations doc can build its relation-cleanup cascade on top of a
working `removeTable`.

## Goals / Non-Goals

**Goals**

- A `removeTable` domain function in `schema.ts`.
- A way to delete the selected table from the UI (button) and from the
  keyboard (Delete/Backspace), both going through the same confirmation
  step already used for schema/column/key deletion.

**Non-Goals**

- Cleaning up foreign-key relations on delete (REQ-021's other half) — no
  relations exist yet; left for the FK-relations doc.
- Any table-scoped undo (REQ-005) — Phase 2, unrelated to this doc.

## Design

### Domain

`removeTable(schema, tableId, options?: { now?: Date })` is added to
`schema.ts` after `moveTable`, completing the table-lifecycle group before
the column functions. It follows the same shape as every other mutation in
the file: no-op if `tableId` doesn't match a table, otherwise filters
`schema.tables` and bumps `updatedAt`. No extra cascade is needed — a
table's `columns`/`keys` are nested inside it, so deleting the table entry
deletes them for free.

### Trigger: side panel, not the canvas node

`TableNode`'s entire card is a single `<button>` with no header row or other
button-safe child slot, so a delete icon inside it would either nest a
`<button>` in a `<button>` (invalid) or require restructuring the node. The
side panel already becomes "about" the selected table (`TableProperties`)
the moment one is selected, so the delete trigger goes there instead: a
`LuTrash2` icon button next to the existing `Table` heading, the same
icon-next-to-heading placement the Toolbar already uses for schema delete.

Clicking it calls `openDialog("deleteTable")` directly — unlike the
column/key delete buttons, which first call `onSelectColumn`/`onSelectKey`
to record which row they're acting on, the side panel is already scoped to
the one table it can delete.

### Confirmation and keyboard delete

A `ConfirmDialog` for `deleteTable` is added in `MainScreenView.tsx`,
identical in shape to the existing `deleteColumn`/`deleteKey` ones: message
names the table, confirming calls `onRemoveTable(selectedTableId)` and
closes the dialog.

Keyboard delete reuses this same dialog rather than deleting immediately.
`MainScreenView.tsx` adds a `window` `keydown` listener for `Delete` /
`Backspace`, active only when no dialog is already open, a table is
selected, and focus isn't in a text input — it calls `openDialog("deleteTable")`,
exactly what the button does. This keeps one deletion path instead of a
button flow that confirms and a keyboard flow that doesn't, matching how
every other destructive action in this app (schema, column, key) is
confirmation-gated.

`Canvas.tsx` sets React Flow's `deleteKeyCode` to `null`. React Flow ships
its own Backspace-to-delete handling on selected nodes; left enabled, it
would act on the canvas's locally-synced `nodes` state (used today only to
animate an in-progress drag before the `tables`-driven resync effect
overwrites it) and cause a visible flicker before our own listener even
runs. Disabling it makes the app's listener the single source of truth.

No selection state is explicitly cleared after a table is deleted — the
same as column/key deletion today. `selectedTableId` stays as-is;
`selectedTable`, derived by looking it up in the current schema, naturally
becomes `undefined` once the table is gone, and the side panel already
falls back to its schema-summary view whenever `selectedTable` is `null`.

## Alternatives Considered

- **React Flow's built-in `onNodesDelete`/`deleteKeyCode`** — rejected: it
  deletes immediately with no confirmation, unlike every other destructive
  action in the app.
- **Delete icon inside `TableNode`** — rejected: the node is one `<button>`;
  nesting a button is invalid, and restructuring the node is more invasive
  than reusing the side panel's existing header-icon pattern.
- **Explicitly clearing selection state on delete** — rejected: no
  precedent for it exists (column/key deletion don't either), and the
  derived lookups already degrade to `null`/`undefined` on their own.
