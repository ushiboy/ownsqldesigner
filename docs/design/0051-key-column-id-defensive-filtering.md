# Key `columnIds` Defensive Filtering

- **Status**: Implemented
- **Created**: 2026-08-28
- **Updated**: 2026-08-28

## Context

[0007](0007-table-key-management.md) shipped `addKey`/`updateKey` without
defensively filtering `columnIds` down to ids that actually exist on the
target table, noting in its Open Questions: _"not implemented here since
`KeyDialog` can only ever offer the table's own columns; revisit if this
proves fragile."_ 0007 is long since `Implemented`, so per
[design-docs.md](../rules/design-docs.md)'s Maintenance rule this follow-up
gets its own numbered doc rather than an inline rewrite of 0007's shipped
content — the same pattern already used for
[0031](0031-composite-key-column-ordering.md) and
[0049](0049-key-row-label-title-tooltip.md), 0007's two other resolved Open
Questions.

Picked via `AskUserQuestion` from a survey of every design doc's Open
Questions against current code, alongside 0002/0003's still-open APG
dropdown keyboard navigation (not picked up here). Today `KeyDialog`
(via `useUndoableSchema.ts`) is the only caller of `addKey`/`updateKey`,
and it can only ever offer the table's own columns, so this closes a
known robustness gap before it becomes a live bug (a future caller, an
import path, or a stale reference to a since-deleted column), not a fix
for an observed one.

## Goals / Non-Goals

**Goals**

- `addKey`/`updateKey` silently drop any `columnIds` entry that doesn't
  correspond to an existing column on the target table, before validating
  or persisting the key.

**Non-Goals**

- Any change to `canAddKey`/`canUpdateKey`'s existing validation rules
  (empty-`columnIds` rejection, PRIMARY_KEY conflict, duplicate-INDEX
  detection, FK-referenceability preservation) — filtering happens
  upstream of them; see Design for why that ordering matters.
- Any change to `KeyDialog` or `useUndoableSchema.ts` — neither can produce
  a nonexistent column id today, so this is purely a domain-layer guard.

## Design

### `sanitizeKeyColumnIds`

A new private helper in `src/domain/schema/key.ts`:

```ts
function sanitizeKeyColumnIds(table: Table | undefined, fields: Omit<Key, "id">): Omit<Key, "id"> {
  if (table === undefined) {
    return fields;
  }
  return { ...fields, columnIds: fields.columnIds.filter((id) => hasColumn(table, id)) };
}
```

`addKey` and `updateKey` both call it immediately after resolving
`targetTable`, and use the sanitized result everywhere downstream —
passed into `canAddKey`/`canUpdateKey` and into the key object that gets
persisted. `hasColumn` (`./shared`) was already imported by this file.

### Filtering happens before validation, not after

Sanitizing first means every existing validation rule
(`fields.columnIds.length === 0`, `keepsColumnReferenceable`,
`hasDuplicateIndexColumnSet`, ...) sees the _intended_ column set, as if
the nonexistent id had never been passed at all — matching the Goal's
"silently drop" wording literally, and matching how a real caller (one
that only had real columns to offer) would have called these functions.
One observable consequence: `updateKey` on an FK-referenced single-column
PRIMARY_KEY/UNIQUE key, given `columnIds: [sameRealColumn, nonexistentId]`,
now succeeds (the nonexistent id is dropped first, so
`keepsColumnReferenceable` sees a length-1 array matching the existing
column and returns `true`) — before this change it would have been
rejected as a no-op, since raw `fields.columnIds.length === 2` failed
`keepsColumnReferenceable` and the key's FK-referenced status blocked
everything else. The end state is identical to the key's current state
either way (same sole column, same referenceability); the only visible
difference is whether the update is treated as a no-op or an
(effectively-identity) applied update. Covered by a dedicated test in
`key.test.ts` (see Alternatives Considered for why validating on the raw
`fields` first was rejected instead).

### `applyColumnKeyMembership` is unaffected

Its own `addKey(schema, tableId, { type, columnIds: [columnId] }, ...)`
call always passes a `columnId` already confirmed to exist via `hasColumn`
in `setColumnKeyMembership`, so `sanitizeKeyColumnIds` is a no-op on that
path.

## Alternatives Considered

- **Validate against the raw `fields` first, sanitize only what actually
  gets persisted** — rejected: this would mean a key request containing
  even one nonexistent id could be validated (and potentially rejected)
  based on column ids that were never going to end up in the stored key,
  which is a more surprising contract than "nonexistent ids are treated as
  if they were never supplied." Sanitizing first keeps `canAddKey`/
  `canUpdateKey`'s existing logic simple and correct against the
  post-filter intent.
- **A new numbered doc's diff to 0007 also bumping 0007's `Updated`
  metadata date** — not done, consistent with 0049's precedent (which
  also only touched 0007's Open Questions text, not its metadata) when
  the edit is confined to striking through an already-resolved bullet.

## Open Questions

None.
