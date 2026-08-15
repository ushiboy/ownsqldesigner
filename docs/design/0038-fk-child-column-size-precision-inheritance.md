# FK Child Column Size/Precision Inheritance

- **Status**: Implemented
- **Created**: 2026-08-15
- **Updated**: 2026-08-15

## Context

`addForeignKeyWithNewColumn` (`src/domain/schema/foreignKey.ts`) generates a
new FK child column by copying the referenced parent column's `type`, but
hardcodes `size: ""` and `precision: ""` instead of copying the parent's
actual values. A parent `VARCHAR(255)` produces a sizeless `VARCHAR` child;
a parent `TIMESTAMP(3)` produces a precisionless `TIMESTAMP` child.

This is a documented fidelity gap: the generated column is always valid by
construction, just less faithful to the parent. It was flagged as a
deferred Non-Goal/Open Question in
[0036](0036-domain-layer-column-normalization.md) ("could be filed as its
own follow-up if it turns out to matter in practice") and applies equally
to `precision`, added later by
[0037](0037-time-timestamp-precision.md). Since both docs are already
`Status: Implemented`, this follow-up gets its own sequentially-numbered
doc per `docs/rules/design-docs.md`'s Maintenance rule rather than
reopening either.

## Goals / Non-Goals

**Goals**

- `addForeignKeyWithNewColumn` copies the referenced parent column's
  `size` and `precision` into the new child column's fields, instead of
  hardcoding `""`/`""`.
- Rely on `addColumn`'s existing `normalize: true` default (already in
  effect for this call site today) to run
  `strategy.normalizeColumnForDialect` as the safety net. Since the
  child's `type` is copied verbatim from the parent, the parent's
  `size`/`precision` eligibility (dialect's `sizableColumnTypes`/
  `precisionColumnTypes`) is always identical to the child's, so no
  additional dialect-aware logic is needed in `foreignKey.ts` itself.

**Non-Goals**

- Propagating a parent's `size`/`precision` to an _already-existing_
  child column when the parent changes later — that's `updateColumn`'s
  `propagateColumnTypeChange` path (REQ-017,
  [0013](0013-foreign-key-type-propagation.md)), which deliberately only
  propagates `type` and leaves `size`/`precision` independently editable
  on the child post-creation. This doc only changes creation-time
  behavior.
- Any other field (`defaultValue`, `nullable`, `autoIncrement`,
  `comment`) — these are already intentionally independent on the child
  and stay that way.
- Numeric validation of `precision`/`size` — out of scope, unrelated to
  this fidelity gap (see 0037's own Non-Goals).

## Design

### Code change

`src/domain/schema/foreignKey.ts`, inside `addForeignKeyWithNewColumn`'s
call to `addColumn`:

```ts
type: referencedColumn.type,
size: referencedColumn.size,
precision: referencedColumn.precision,
```

`referencedColumn` (the parent `Column`) is already resolved and in scope
via `resolveForeignKeyWithNewColumnTargets`. No other call sites change —
`addColumn`'s existing default `normalize: true` behavior already applies
`normalizeColumnForDialect`, which keeps the copied value only if
`column.type` (== the copied parent type) is in the dialect's
`sizableColumnTypes`/`precisionColumnTypes`, exactly the desired
behavior.

## Alternatives Considered

- **Re-derive size/precision eligibility explicitly in `foreignKey.ts`
  before calling `addColumn`** — rejected: redundant, since
  `normalizeColumnForDialect` already does this and the child's type is
  copied verbatim from the parent, so eligibility is guaranteed to
  match.
- **Also extend REQ-017's propagation to sync `size`/`precision` on
  parent changes** — rejected/out of scope: 0013 deliberately treats a
  child's `size`/`precision` as independently editable after creation;
  changing that is a separate, larger behavioral decision that deserves
  its own sign-off, not bundled into a fidelity fix for the creation
  path.
