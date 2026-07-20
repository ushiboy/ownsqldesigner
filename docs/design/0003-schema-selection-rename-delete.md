# Schema Selection, Rename, and Delete

- **Status**: Implemented
- **Created**: 2026-07-19
- **Updated**: 2026-07-19

## Context

[0001](0001-main-screen.md) fixed the schema-management UX: the toolbar
schema-name dropdown switches schemas (REQ-025), and the pencil / trash
buttons next to the name rename (REQ-037) and delete (REQ-036) the
**current** schema via dialogs. [0002](0002-schema-persistence-and-creation.md)
built the document model, the repository, auto-save, and the creation
flow, but explicitly deferred this trio — today the dropdown lists saved
schemas as disabled items and the pencil / trash buttons are inert
placeholders.

This doc settles selection, rename, and delete, completing Phase 1 schema
management on the foundation 0002 laid down.

## Goals / Non-Goals

**Goals**

- Switch the current schema by picking one from the dropdown (REQ-025),
  with the current schema marked in the menu.
- Rename the current schema via a prefilled name dialog (REQ-037).
- Delete the current schema behind a confirmation dialog (REQ-036),
  including the policy for what becomes current afterwards.
- A `remove` operation on the repository (deferred by 0002 until a
  consumer existed).
- First real use of the notification bar: surfacing a failed selection
  load.

**Non-Goals**

- Renaming or deleting _non-current_ schemas from the dropdown — 0001
  deliberately put these operations on the current schema only.
- Undo / trash for deleted schemas; REQ-036 asks for removal from
  browser storage.
- Save-failure UX (quota, private mode) — still deferred, per 0002.
- Multi-tab consistency — still out of scope, per 0002.
- Dropdown arrow-key navigation (carried over as an open question).

## Design

### Selection

Picking a schema in the dropdown loads it by id and replaces the current
schema **without touching `updatedAt`**: `updatedAt` means "content was
modified", and recency-of-use is already tracked by the last-schema-id
pointer, which the existing auto-save effect moves as a side effect of
the switch. The switch does re-save the just-loaded document unchanged —
that byte-identical write is the price of keeping the single save path
from 0002 instead of introducing a dirty flag.

The menu marks the current schema (checkmark + `aria-current`) so the
list answers "where am I" without closing the menu to check the toolbar.

If the load returns `null` (the entry was deleted in another tab, or is
corrupt), the current schema stays, the list is refreshed so the stale
entry disappears, and the reason is shown in the **notification bar**
from 0001 — its first real use. The message stays until addressed
(0001 rejected toasts for exactly this reason): it is cleared by an
explicit dismiss button or by the next successful schema operation.

### Rename

Rename is a pure domain operation: a copy of the document with the new
name and a bumped `updatedAt` — unlike selection, a rename _is_ a
content edit. The mutation flows through the same state setter as every
other edit, so the auto-save effect persists it with zero new
persistence code; this is the payoff of 0002's centralized save path.

The pencil button opens the **same name dialog as creation**, prefilled
with the current name and with rename-specific labels. The dialog is
generalized (title, submit label, initial value) rather than forked —
see Alternatives. Confirming an unchanged name is a no-op so a casual
open-and-confirm does not dirty `updatedAt`.

### Delete

The trash button opens a confirmation dialog that names the schema being
deleted. On confirm the document is removed from storage and the
workspace switches to a successor:

- **the most-recently-updated remaining schema**, mirroring the startup
  "restore what you were last working on" semantics; and
- if none remain, a blank default-named schema is created — the same
  path as the first visit, so "no schemas exist" stays an
  unrepresentable state and deleting the last schema needs no special
  handling.

The repository gains `remove(id)`, the operation 0002 deliberately left
out until this consumer existed.

Two ordering details carry the correctness of the flow and are worth
recording:

- **No resurrection.** The removal completes _before_ the successor is
  set as current, so by the time the auto-save effect runs it can only
  see the successor — a stale save can never write the deleted document
  back.
- **The last-schema-id pointer is left dangling for one beat.** The
  successor's auto-save overwrites it immediately, and the startup path
  already tolerates a dangling pointer, so an explicit clear operation
  on the repository would be dead weight.

### Dialogs

The name dialog from 0002 is parameterized instead of duplicated; the
trim-validation stays in one place, and the same component serves
creation and rename. Delete gets a new confirmation dialog with a
destructive-styled confirm button. Both sit on a shared **base `Dialog`
component** in `src/components/parts/` that owns everything every dialog
repeats — the overlay, the jsdom `showModal` workaround, Escape-to-close,
the title/aria wiring, and the footer-button styles — while each dialog
supplies only its content. (An earlier draft duplicated these per
dialog; review feedback pulled the base out once the second dialog made
the repetition visible.)

### Shared state via context

The open-dialog state and the notification live in **React contexts**
provided at the top of the page, not in props threaded down from the
container:

- The active dialog is a single union-typed value (create / rename /
  delete confirmation / none), so overlapping dialogs stay
  unrepresentable; any trigger — toolbar buttons, menu items — opens a
  dialog directly instead of relaying a request through every layer.
- Any component can raise a notification directly, which is exactly what
  future producers (canvas edits, integrity violations from REQ-023)
  will need.

0002 rejected Context "until a second consumer appears"; these triggers
and producers spread across the component tree are that second consumer,
and review feedback confirmed the prop relay had become the worse
trade.

## Alternatives Considered

- **A separate rename dialog component** — rejected: it would duplicate
  the overlay, validation, Escape handling, and the jsdom workaround;
  only three strings and the initial value differ.
- **Prop-drilled dialog/notification state (no Context)** — the initial
  implementation; rejected in review: every trigger and producer needed
  a handler relayed through the container, the view, and each
  intermediate component, and the relay would widen with every future
  notification producer.
- **Always creating a blank schema after delete** — rejected: it throws
  the user out of their real work whenever other schemas exist.
- **Alphabetical-first successor** — rejected: arbitrary; recency
  matches the startup-restore semantics the user already knows.
- **Clearing the last-schema-id pointer on delete** — rejected: the
  successor's auto-save overwrites the pointer immediately and startup
  tolerates dangling pointers; a repository operation for a one-beat
  window buys nothing.
- **`window.confirm` for delete confirmation** — rejected: unstylable,
  inconsistent with the app's dialog language, and awkward to exercise
  in tests.
- **Bumping `updatedAt` on selection ("last opened")** — rejected: it
  conflates viewing with editing; recency-of-use already lives in the
  last-schema-id pointer.
- **Soft-delete / trash instead of hard delete** — rejected: REQ-036
  asks for removal from browser storage; undo is unrequested scope.
- **Failing selection silently** — rejected: the user clicked something
  and nothing happening is confusing; the notification bar exists for
  exactly this kind of feedback and stays visible until addressed.

## Open Questions

- Whether the dropdown gets full APG arrow-key navigation or stays
  click/Escape-only (carried over from 0002).
- Save-failure UX (quota exceeded, private mode) remains undesigned; the
  notification-bar plumbing added here is the likely surface.
