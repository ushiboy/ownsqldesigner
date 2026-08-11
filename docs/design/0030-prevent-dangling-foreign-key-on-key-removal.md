# Prevent Dangling Foreign Key on Key Removal

- **Status**: Implemented
- **Created**: 2026-08-11
- **Updated**: 2026-08-11 (revised after review: the SidePanel delete-key
  flow cascades with confirmation instead of being blocked; see Design)

## Context

[0009](0009-foreign-key-relations.md) implemented REQ-021's table/column-deletion
half (deleting a table or column always cleans up any foreign key that
pointed at it) but left one case unresolved, quoted from its own Open
Questions:

> REQ-021 only requires that deleting a table/column never leaves a dangling
> reference. It does not require the same for un-keying a PRIMARY
> KEY/UNIQUE column that's still referenced by another table's FK — e.g.
> removing a column's sole UNIQUE key while a foreign key still points at
> it. That case is left unresolved here; revisit if it proves confusing in
> practice.

Concretely, `removeKey`/`updateKey`/`setColumnKeyMembership`
(`src/domain/schema/key.ts`) had no awareness of `foreignKeys` on other
tables. Removing or retyping a column's sole `PRIMARY_KEY`/`UNIQUE` key left
any foreign key that referenced it pointing at a column no longer eligible
as an FK target (REQ-020's invariant), with none of REQ-021's existing
cleanup triggered, since the column itself was untouched. This doc closes
that gap.

## Goals / Non-Goals

**Goals**

- Never leave an FK pointing at a column that has stopped being a sole
  PRIMARY KEY/UNIQUE column, whichever path removed that status.
- `SidePanel`'s "delete key" flow — the app's one dedicated, already
  dialog-backed entry point for removing a key outright — cascades: when
  the selected key is referenced, its confirm dialog warns that the
  referencing relation will be removed too, and confirming removes both
  the key and that foreign key in one action. This follows the same
  cascade-with-confirmation shape already used by `deleteTable` (which
  warns "All its columns and keys will be removed too").
- `ColumnDialog`'s key-membership checkboxes still get UI prevention (a
  disabled checkbox with an explanatory hint) rather than cascading,
  since unchecking a box is a single field inside a larger form with one
  combined submit — there's no natural place to ask "also delete the
  relation?" for just that one field without a bigger rework of the form's
  interaction model. See Alternatives Considered.

**Non-Goals**

- `KeyDialog`'s edit form does not get prospective UI prevention for "this
  edit would make the key stop covering its currently-referenced column"
  (e.g. changing a referenced UNIQUE key's type to INDEX, or adding a
  second column to it). The domain-level guard silently keeps the key
  unchanged in that case, consistent with 0007/0009's precedent that not
  every edge case gets a dedicated UI affordance — only a domain no-op as a
  safety net. Left as a candidate follow-up if it proves confusing in
  practice, mirroring the tone of the open question this doc resolves.
- Cascading from `ColumnDialog`'s checkbox path — see Goals above and
  Alternatives Considered below for why this stays block-only.
- Composite PRIMARY_KEY/UNIQUE keys need no new handling: they were already
  excluded from being FK targets (`isReferenceableColumn` requires
  `columnIds.length === 1`), so this change only ever needs to protect
  single-column keys.
- No change to `removeTable`/`removeColumn` cascade-delete behavior — that
  half of REQ-021 already works correctly (deleting the column/table also
  removes the referencing FK, so there is no dangling state to prevent
  there).

## Design

### Domain layer: two new predicates

`src/domain/schema/key.ts` gains:

```ts
export function isColumnReferencedByForeignKey(
  tables: Table[],
  tableId: string,
  columnId: string,
): boolean;

export function isKeyReferencedByForeignKey(tables: Table[], tableId: string, key: Key): boolean;
```

Both take `tables: Table[]` rather than a single `Schema`, matching
`shared.ts`'s existing `removeForeignKeysReferencingTable`/
`removeForeignKeysInvolvingColumn` convention of scanning the whole table
list. `isKeyReferencedByForeignKey` is `false` for any key that isn't a
single-column `PRIMARY_KEY`/`UNIQUE` key, since only those can ever be an FK
target.

### Guarding removal and update (the block-only path)

- `removeKey` no-ops (in addition to its existing "key doesn't exist"
  check) when `isKeyReferencedByForeignKey` is true for the target key.
- `canUpdateKey` (the private guard behind `updateKey`) gains a `tables`
  parameter and rejects an update that would make a currently-referenced
  key stop being a sole `PRIMARY_KEY`/`UNIQUE` key on the same column —
  it still allows toggling a referenced key between `PRIMARY_KEY` and
  `UNIQUE` on that same column, since both remain valid FK targets.
- `setColumnKeyMembership` needed no direct change: it already composes
  `removeKey` internally (via its private `applyColumnKeyMembership`
  helper), so guarding `removeKey` alone covers `ColumnDialog`'s "uncheck
  PRIMARY KEY/UNIQUE" path too.

This is 0007/0009's established split for "simple validity" rules: UI
prevention as the primary mechanism, a cheap domain-level no-op as
defense-in-depth — never a `notify()`-based rejection. It's what
`ColumnDialog` relies on (see below).

### Cascading removal (the confirm-and-cascade path)

For `SidePanel`'s dedicated "delete key" flow, review feedback favored
cascading over blocking: since that flow already goes through a
`ConfirmDialog` (`DialogHost`'s `deleteKey` dialog), the same dialog can
just say what deleting will do and act on it, rather than silently
disabling the button and pushing the user to a separate screen to remove
the relation first.

`src/domain/schema/key.ts` gains `removeKeyCascadingForeignKeys(schema,
tableId, keyId, options)`: it strips any foreign key referencing the
target key's column via a new `removeForeignKeysReferencingColumn(tables,
tableId, columnId)` helper in `shared.ts` (deliberately more precise than
the existing `removeForeignKeysInvolvingColumn` — it only strips _incoming_
references to `columnId`, leaving alone any _outgoing_ FK the same column
might itself hold as a child column), then delegates to the now-unblocked
`removeKey`.

`DialogHost` computes `isSelectedKeyReferenced` via
`isKeyReferencedByForeignKey(tables, selectedTable.id, selectedKey)` (using
its own `useTables()`, no new prop needed) and branches the `deleteKey`
`ConfirmDialog`:

- Referenced: message is `keyDialog.deleteConfirmMessageReferenced` ("...
  A foreign key on another table references it — that relation will be
  removed too. ..."), and confirming calls the new
  `removeKeyCascadingForeignKeys` action.
- Not referenced: unchanged — `keyDialog.deleteConfirmMessage` and the
  existing `removeKey` action.

`SidePanel`'s key-row delete button itself needed no change and stays
unconditionally enabled — the branching lives entirely in `DialogHost`,
which already owns the confirm-message-and-action logic for every other
delete flow in the app.

### UI: a reason instead of a boolean (ColumnDialog only)

`getColumnKeyMembershipDisabled` previously returned one boolean per key
type, conflating two causes (`hasConflictingPrimaryKey`,
`isMemberOfCompositeKeyOfType`) into a single flag, with a hint text keyed
by key type. Adding a third cause without distinguishing it would show a
factually wrong hint (e.g. "Another key already holds this table's PRIMARY
KEY" when the real reason is "removing this would break a foreign key").
The return type changed to carry a reason:

```ts
export type KeyMembershipDisabledReason =
  "CONFLICTING_PRIMARY_KEY" | "PART_OF_COMPOSITE_KEY" | "REFERENCED_BY_FOREIGN_KEY";
export type ColumnKeyMembershipDisabled = Record<KeyType, KeyMembershipDisabledReason | null>;
```

`ColumnDialog` disables a checkbox when its reason is non-`null` and looks
up the hint text by reason (`keyMembershipDisabledHint.${reason}`) instead
of by key type — the checkbox's own label already conveys which key type is
affected, so a reason-keyed (rather than type-and-reason-keyed) hint set is
enough.

## Alternatives Considered

- **Block `SidePanel`'s delete-key button too, with the same
  disabled-plus-hint treatment as `ColumnDialog`** — this was the original
  design. Rejected after review: it forces the user to leave the Keys
  section, find the referencing relation elsewhere, delete it, then come
  back, when the app already has a cascade-with-confirmation pattern
  (`deleteTable`) for exactly this "deleting X also removes Y" shape. The
  confirm dialog can simply say so and do both, which is less friction for
  a case that's easy to state precisely (one key, one or more clearly
  identifiable referencing FKs) and easy to undo (the app has undo/redo).
- **Cascade from `ColumnDialog`'s checkbox too, for full consistency** —
  rejected for this round: that path has no per-field confirmation step
  today (the whole form submits at once), so cascading there would need a
  nested "are you sure" interaction or a bigger rework of the submit flow.
  The checkbox stays block-only, with a hint that still lets the user reach
  the cascading path via the Keys section. Revisit if this split proves
  confusing in practice.
- **Block with a `notify()`-based rejection message** (for the
  `ColumnDialog` path) — rejected, following 0007/0009's explicit
  precedent against this pattern for this category of rule (simple,
  structurally-checkable validity rules get UI prevention + domain no-op,
  not a toast).
- **Keep the boolean `ColumnKeyMembershipDisabled` shape and reuse the
  existing per-key-type hint text for the new case too** — rejected: the
  existing PRIMARY_KEY/UNIQUE hints ("another key already holds this...",
  "part of a composite key...") are factually wrong for the new cause, and
  showing the wrong reason is worse than the small type-shape change needed
  to carry the real one.
- **Full UI prevention in `KeyDialog`'s edit form** (prospectively
  simulating whether an edit would break referenceability) — rejected as
  disproportionate scope for this change; the domain no-op safety net
  already prevents the invariant violation, and 0007/0009 both accept that
  not every edge case needs a dedicated UI affordance. See Non-Goals.

## References

- [0009 — Foreign Key Relations](0009-foreign-key-relations.md)
- [0007 — Table Key Management](0007-table-key-management.md)
