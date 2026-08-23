# Prevent Duplicate INDEX Column Sets

- **Status**: Implemented
- **Created**: 2026-08-23
- **Updated**: 2026-08-23

## Context

[0010](0010-name-validation-and-sql-export.md)'s DDL export left one Open
Question unresolved: `generateDdl` names each `CREATE INDEX` statement
`idx_<table>_<col1>_<col2>...`, and its `uniqueIndexName` helper silently
appends `_2`, `_3`, ... whenever two `INDEX` keys on the same table produce
the same base name — i.e. two `INDEX` keys covering the exact same columns
in the exact same order. The generated SQL stays valid, but the collision is
never surfaced to the user; `KeyDialog` lets them create the redundant
second key without any feedback that it duplicates an existing one.

This follow-up was picked from the design docs' outstanding Open Questions
list ([[requirements-fully-implemented-followups]]) via `AskUserQuestion`,
alongside two other candidates (per-type `size`/`defaultValue` constraints
from 0006, and APG dropdown keyboard navigation from 0002/0003).

## Goals / Non-Goals

**Goals**

- Detect when a candidate `INDEX` key's column order exactly matches
  another `INDEX` key already on the same table.
- Block `KeyDialog`'s Save/Add button and show an inline hint in that case,
  consistent with [0042](0042-key-dialog-referenced-edit-prevention.md)'s
  `wouldBreakReference` pattern for the referenced-key case.
- Enforce the same rule at the domain layer (`addKey`/`updateKey`), so the
  invariant holds regardless of UI path.

**Non-Goals**

- `PRIMARY_KEY`/`UNIQUE` keys sharing a column set — these are emitted as
  anonymous inline constraints (no generated name), so they have no
  collision to prevent.
- Two `INDEX` keys covering the same _set_ of columns in a _different_
  order (e.g. `(a, b)` vs `(b, a)`) — `uniqueIndexName`'s base name embeds
  column order, so these do not collide, and the two indexes are not
  redundant in general (composite-index leading-column semantics differ).
- Renaming or otherwise resolving an already-existing duplicate created
  before this change — this only prevents new duplicates going forward.

## Design

### Domain

`hasDuplicateIndexColumnSet(keys: Key[], fields: Omit<Key, "id">): boolean`
(`src/domain/schema/key.ts`) returns true when `fields.type === "INDEX"` and
some key in `keys` is also `INDEX` with the identical `columnIds` sequence.
Callers pass the table's _other_ keys (self already excluded), matching how
`keepsColumnReferenceable` is used alongside `isKeyReferencedByForeignKey`.

`canAddKey` and `canUpdateKey` both call it as an additional guard next to
the existing `hasConflictingPrimaryKey` check, so `addKey`/`updateKey`
no-op (same as any other rejected edit) rather than allow the duplicate.

### UI

`KeyDialog` gains an `existingKeys: Key[]` prop — the table's keys minus
whichever key is currently being edited (empty array for the Add flow).
`KeyForm` recomputes `isDuplicateIndex` from live `type`/`columnIds` state
on every render, the same way it already recomputes `wouldBreakReference`,
and disables Save/Add plus shows `keyDialog.duplicateIndexHint` whenever
true.

`DialogHost` computes `otherKeys` once (`selectedTable.keys` filtered by
`selectedKey?.id`) and passes it to both the add and edit `KeyDialog`
instances. Since `MainScreenView`'s `onAddKey` handler already calls
`selectKey(null)` before opening the dialog, `selectedKey` is always `null`
for the add flow, so `otherKeys` naturally becomes the table's full key list
there.

## Alternatives Considered

- **Warn but don't block** (allow Save, just show the hint) — rejected:
  every other "this edit produces an invalid/unrepresentable state" case in
  this codebase (0039/0040's format validation, 0042's referenced-key
  guard) blocks Save rather than allowing a known-redundant state through
  with just a warning; a blocking hint is more consistent and the domain
  layer already needs the hard guard regardless of the UI's choice.
- **Enforcing "same column set regardless of order"** — rejected: it would
  block two genuinely different composite indexes (`(a, b)` vs `(b, a)`
  are different query-planning shapes), and neither `uniqueIndexName` nor
  SQL semantics treat them as duplicates.

## Open Questions

None.
