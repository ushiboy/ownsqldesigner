# Foreign Key Type Propagation

- **Status**: Implemented
- **Created**: 2026-07-27
- **Updated**: 2026-07-27

## Context

[0009](0009-foreign-key-relations.md) built foreign-key creation/deletion and
explicitly carved out "FK column type compatibility validation" as a separate
concern. [0012](0012-foreign-key-child-column-generation.md) implemented
REQ-016: creating a foreign key via canvas drag can auto-generate a new child
column whose `type` is copied from the referenced (parent) column at creation
time (`addForeignKeyWithNewColumn`, `schema.ts`). That doc explicitly deferred
REQ-017 — keeping that copy in sync when the parent's type is edited _later_
— to its own doc, since it's about propagation after the fact, not creation.

Before this change, `updateColumn` had no awareness of `foreignKeys` anywhere
in the schema: editing a parent column's type left every already-linked
child column silently at its old, now-mismatched type.

## Goals / Non-Goals

**Goals**

- Editing a column's `type` via `updateColumn` propagates the new type to
  every column that is its FK child, directly or transitively through a
  chain of FKs. Chains are real in this schema (a child column can later
  become a referenceable PK/UNIQUE column that another table's FK targets),
  and self-reference is already an exercised gesture (0012).
- Propagation is silent and automatic — no dialog, no notification — matching
  REQ-016's precedent of silently copying the type with no user input.
- Propagation only runs when `type` actually changed on the edited column,
  and is safe against cycles in the FK graph (self-reference, or a cycle
  spanning multiple tables) without needing a separate visited-set.

**Non-Goals**

- Propagating any column field other than `type` (name, nullable, size,
  defaultValue, comment, autoIncrement stay independently editable on child
  columns).
- Any user-facing notice of which columns got cascaded.
- Dialect-specific type-compatibility/coercion rules — out of scope per 0009;
  `SQLITE_COLUMN_TYPES` is one closed enum today, so this is a mechanical
  copy, not a conversion.
- Reacting to non-type parent-side changes (rename, losing PK/UNIQUE status,
  deletion) — already handled by the existing
  `removeForeignKeysInvolvingColumn`/`removeForeignKeysReferencingTable`
  (REQ-021).
- Any change to `addForeignKey`/`addForeignKeyWithNewColumn` creation-time
  behavior.

## Design

`updateColumn` now compares the edited column's stored `type` against the
incoming `fields.type` before returning. When they differ, the already-mapped
`tables` array is piped through a new private `propagateColumnTypeChange`;
when they're equal (the common case — most edits are to name/nullable/etc.),
it's returned unchanged, so no cross-schema scan runs on unrelated edits.

`propagateColumnTypeChange(tables, columnId, type)` is a worklist over
column ids, placed next to the file's existing full-schema-scan helpers
(`removeForeignKeysReferencingTable`/`removeForeignKeysInvolvingColumn`,
added for REQ-021's cascade-delete) since it scans the same shape of data
(every table's `foreignKeys` list) for the same kind of cross-table match.
Starting from the edited column, each iteration finds every FK across every
table whose `referencedColumnId` is the current column, updates the owning
column's `type` (re-running `withNormalizedAutoIncrement` on any table it
actually touched, the same call every other column-mutating function in this
file already makes), and enqueues any column that just changed for the next
round — so a grandchild column gets the same update once its immediate
parent has already been updated to the new type.

**Cycle safety**: a column is only enqueued when its stored type just
changed _to_ `type` (guarded by `column.type !== type`). Once a column
equals `type`, revisiting it through any other FK edge is a no-op and it's
never re-enqueued — a column can transition at most once, so the worklist is
bounded by the total column count regardless of cycles in the
`referencedColumnId → columnId` graph (self-reference, or an N-table cycle).
The "already-at-target-type" check doubles as the visited-set; no separate
one is needed.

`propagateColumnTypeChange` stays private — it's exercised only through
`updateColumn`'s existing exported surface, the same way
`removeForeignKeysInvolvingColumn`/`removeForeignKeysReferencingTable` are
never exported themselves.

## Alternatives Considered

- **Explicit visited-`Set<string>`** — rejected: redundant given the
  "already-at-target-type" check already guarantees termination on its own;
  a second data structure would just duplicate that guarantee.
- **Recursive depth-first walk** instead of a worklist — rejected only for
  style consistency with the existing worklist-shaped scanning helpers
  already in this file; no functional difference here.
- **Only propagating to direct FK children** (no transitive chase) —
  rejected: would leave a grandchild column silently mismatched after a
  chain edit, reintroducing the exact inconsistency this doc exists to
  prevent.
