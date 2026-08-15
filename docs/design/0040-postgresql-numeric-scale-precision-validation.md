# PostgreSQL NUMERIC Scale ≤ Precision Validation

- **Status**: Implemented
- **Created**: 2026-08-15
- **Updated**: 2026-08-15

## Context

[0039](0039-column-size-precision-format-validation.md) added format
validation for PostgreSQL `size`/`precision`, but deliberately left NUMERIC's
cross-field relationship out of scope: `isPostgresqlSizeValid`'s `NUMERIC`
branch checks `precision` and `scale` independently via
`NUMERIC_SIZE_PATTERN`, with no comparison between them. `NUMERIC(5,10)`
therefore passes the app's validation today, even though PostgreSQL (versions
before 15) rejects a scale greater than precision at DDL-execution time. 0039
names this explicitly ("so it reads as a deliberate scope cut, not an
oversight"). Since 0039 is already `Status: Implemented`, this follow-up gets
its own doc per `docs/rules/design-docs.md`'s Maintenance rule, mirroring how
[0038](0038-fk-child-column-size-precision-inheritance.md) handled a similar
previously-deferred Non-Goal.

## Goals / Non-Goals

**Goals**

- `isPostgresqlSizeValid`'s `NUMERIC` branch rejects a value whose scale
  exceeds its precision (e.g. `"5,10"`), in addition to the existing
  regex-shape check.
- `scale == precision` stays valid (e.g. `"10,10"`), matching PostgreSQL's
  actual rule (`scale <= precision`, not strictly less).
- A bare precision with no scale (e.g. `"10"`) is unaffected — the new
  comparison only applies when a scale segment is present.
- Update the `sizeInvalidFormatHint` copy (`en.ts`/`ja.ts`) to mention the
  scale ≤ precision constraint.

**Non-Goals**

- PostgreSQL 15+'s relaxed rule (which permits scale to exceed precision) —
  `DialectStrategy` has no concept of a PostgreSQL version today, and
  introducing one for a single validation rule is out of proportion. This doc
  enforces the stricter, universally-safe rule regardless of target
  PostgreSQL version: any schema valid under it is valid on every supported
  version.
- The magnitude ceiling (`NUMERIC` precision ≤ 1000) — still out of scope,
  per 0039's own Non-Goals.
- Retroactive validation of already-saved/imported schemas — still out of
  scope, per 0039's Open Questions; unchanged by this doc.
- Any change to `isPostgresqlPrecisionValid` or the `DialectStrategy`
  interface — this is a same-shape fix scoped entirely inside
  `isPostgresqlSizeValid`'s existing `NUMERIC` branch.

## Design

### Code change

`src/domain/postgresql/sizeAndPrecisionValidation.ts`:

```ts
if (type === "NUMERIC") {
  if (!NUMERIC_SIZE_PATTERN.test(value)) return false;
  const [precision, scale] = value.split(",").map(Number);
  return scale === undefined || scale <= precision;
}
```

Kept inside the existing regex-gated branch: `NUMERIC_SIZE_PATTERN` already
guarantees at most one comma and that both parts (when scale is present) are
non-negative integers, so the `Number(...)` parse here can't fail or need
extra guarding.

### UI copy

`sizeInvalidFormatHint` in `src/i18n/messages/en.ts` and `ja.ts` updated to
mention the scale ≤ precision constraint alongside the existing shape
description.

## Alternatives Considered

- **Extending `NUMERIC_SIZE_PATTERN` itself** (lookahead/backreference) to
  compare the two digit groups — rejected: a regex can't compare two
  arbitrary-length numeric captures for magnitude, only exact digit-sequence
  equality.
- **Version-aware validation** matching PostgreSQL 15's relaxed rule —
  rejected: no PostgreSQL-version concept exists in `DialectStrategy` today;
  the stricter universal rule is a safe subset.

## Open Questions

None.
