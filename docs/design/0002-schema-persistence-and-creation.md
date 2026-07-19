# Schema Persistence and Creation

- **Status**: Implemented
- **Created**: 2026-07-18
- **Updated**: 2026-07-18

## Context

[0001](0001-main-screen.md) settled the main-screen UX around schemas: the
toolbar schema name is a dropdown listing saved schemas plus a "+ New
Schema" item, startup restores the last-edited schema (auto-creating a
blank one on the very first visit), and every edit is auto-saved. None of
that exists yet — the codebase has no schema data model, no storage code,
and the toolbar/side-panel widgets are inert placeholders.

This doc settles the schema document model, the browser-storage layout,
the persistence architecture, and the creation flow (REQ-035), which
together form the foundation the remaining Phase 1 features build on.

## Goals / Non-Goals

**Goals**

- Define the schema document model and its runtime validation.
- Define the localStorage layout and a storage-agnostic repository
  interface (REQ-024/025 storage foundation).
- Startup restore of the last-edited schema; first-visit auto-creation of
  a blank schema (REQ-035).
- Creating a new named schema from the toolbar dropdown via a name dialog
  (REQ-035), with the dropdown listing saved schemas.
- Centralized auto-save wiring (REQ-024).

**Non-Goals**

- Switching to another saved schema (REQ-025 selection), rename
  (REQ-037), delete (REQ-036) — the dropdown lists schemas but selecting
  them stays inert until those docs.
- The table/column model (REQ-009/010) — `tables` is reserved but empty.
- SQL export, file download/load.
- Storage-quota / save-failure UX (see Open Questions).

## Design

### Data model

A schema document is `{ id, name, tables, createdAt, updatedAt }`,
defined as a **zod schema** with the TypeScript type inferred from it
(`z.infer`), so the compile-time type and the runtime validation used by
persistence can never drift apart.

- **`id` is the identity** (`crypto.randomUUID()`); names are labels and
  may duplicate. This keeps rename (REQ-037) a pure metadata edit and
  avoids name-collision rules the requirements never asked for.
- **Timestamps are ISO-8601 strings** (`z.iso.datetime()`), not `Date`
  objects: they serialize losslessly to JSON, sort lexicographically, and
  need no revival on load. date-fns parses/formats them at the display
  edge.
- **`tables` is typed as an empty array** (`z.array(z.never())`): the
  persisted value is always `[]`, so widening the element type when the
  table model is designed (REQ-009's doc) needs no data migration.
- The document itself carries **no version field**; versioning belongs to
  the storage envelope, because a format bump is a storage concern, not a
  property of the domain object.

### Storage layout

localStorage, one entry per schema:

- `ownsqldesigner:schema:<id>` → `{ "version": 1, "schema": { ... } }`
- `ownsqldesigner:last-schema-id` → the raw id of the last-edited schema

There is deliberately **no index key** listing all schema ids: the list
operation scans keys by prefix instead. An index would have to be written
in the same breath as every document write, and localStorage has no
transactions — a desynced index is a strictly worse failure mode than a
slightly slower scan over a handful of keys.

Every document is wrapped in a **versioned envelope** and validated with
zod on read. A corrupt or unknown-version entry loads as `null` and is
skipped by the list — it is never deleted, so the raw data stays available
for manual recovery or a future migration.

### Repository

Persistence hides behind a `SchemaRepository` interface (list / load /
save / load-last-id / save-last-id) **defined in the domain layer**
(`src/domain/`), with the localStorage implementation in
`src/infrastructure/`. The dependency arrow points only from
infrastructure to domain, so replacing localStorage with IndexedDB later
touches nothing but infrastructure.

The interface is **Promise-based even though localStorage is
synchronous**: making the signatures async now costs nothing (callers
already run in effects) and is exactly what keeps the IndexedDB swap a
drop-in. The interface carries only the operations this scope needs — no
speculative `remove`/`rename` until REQ-036/037 are designed.

### State and auto-save

The current schema lives in a single custom hook owned by the MainScreen
container — no Context and no store library, because there is one page
and one consumer; that decision is revisited when a second consumer
(undo/redo, canvas state) actually appears.

Auto-save is implemented as **one effect subscribed to the current-schema
state**: any mutation goes through the state setter, and the single
effect persists the document and the last-edited pointer. Centralizing
the save path means future features (table edits, moves) get auto-save
for free and there is exactly one place to add debouncing or failure
handling later. Whole-document writes are fine: a schema JSON is tens of
kilobytes at worst, so diffing or partial writes buy nothing.

On startup the hook loads the last-edited pointer and document; if either
is missing (first visit, or a dangling pointer) it creates a blank schema
named "New Schema" and lets the auto-save effect persist it. The restore
resolves in a microtask, so the UI renders immediately with placeholder
values instead of a loading state.

### Creation flow (REQ-035)

"+ New Schema" in the toolbar dropdown opens a **name-input dialog**; on
confirm, a blank schema with the trimmed name is created, becomes
current, and is persisted by the auto-save effect. The confirm button is
**disabled while the trimmed name is empty** — an inline error message
would add copy and state for a rule the disabled button already
communicates.

The dialog is a custom fixed-position overlay (`role="dialog"` +
`aria-modal`) rather than the native `<dialog>` element: jsdom (v29) does
not implement `showModal()`/`close()`, so the native element cannot be
exercised by the Vitest suite. Escape closes via a document-level keydown
listener, and the overlay is mounted only while open so the input resets
on each mount.

The first-visit auto-created schema is the one asymmetry: it gets the
default name without a dialog, because on first paint there is nothing to
show without a document, and forcing a naming ceremony before the user
has seen the app is hostile. Rename (REQ-037) covers fixing the default
name.

### Dropdown listing

Saved schemas render in the dropdown sorted by name so the menu is
stable across sessions. In this scope the entries are disabled; REQ-025's
doc activates selection.

## Alternatives Considered

- **Single "all schemas" localStorage key** — rejected: every save
  rewrites every schema, and one corrupt byte loses all documents instead
  of one.
- **Index key holding the schema id list** — rejected: dual writes
  without transactions invite a desynced index; prefix scan is cheap at
  this scale.
- **IndexedDB now** — rejected: the access pattern is whole-document
  read/write with no queries or blobs, so IndexedDB's async setup and
  test-harness cost buys nothing today; the async repository interface
  keeps the door open.
- **Context / store library (zustand, ...)** — rejected: one page, one
  consumer; revisit when undo/redo or cross-page state exists.
- **Auto-generated names ("New Schema 2", ...) instead of a dialog** —
  rejected: the user ends up renaming anyway; asking once up front is one
  interaction and produces meaningful names.
- **Hand-written TypeScript types + ad-hoc validation** — rejected: the
  persisted format needs runtime validation regardless (localStorage is
  user-editable), and zod derives the static type from the same source of
  truth.

## Open Questions

- Save failures (quota exceeded, private mode) are currently silent; the
  notification bar from 0001 is the likely surface once error UX is
  designed.
- Multi-tab use can race on the last-edited pointer and on documents;
  out of scope for now.
- Whether the dropdown menu gets full APG arrow-key navigation or stays
  click/Escape-only.
