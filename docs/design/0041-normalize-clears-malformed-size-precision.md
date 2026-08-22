# Normalize Clears Malformed Size/Precision

- **Status**: Implemented
- **Created**: 2026-08-15
- **Updated**: 2026-08-15

## Context

[0039](0039-column-size-precision-format-validation.md) added
`DialectStrategy.isSizeValid`/`isPrecisionValid` and wired them into
`ColumnDialog.tsx` to block Save when a user types a malformed value into an
eligible field (e.g. `"abc"` into a `VARCHAR` column's Size). That closes the
gap for interactive edits.

`normalizeColumnForDialect` (`src/domain/dialect/dialectStrategy.ts:65-82`)
is a separate, older function that clears `size`/`precision` only when a
column's `type` is _ineligible_ for the field at all (e.g. a `BOOLEAN`
column with a stale `size`). It never re-checks the field's _content_ once
the type is eligible. This function runs on every table mutation
(`addColumn`/`updateColumn`/`removeColumn`/`propagateColumnTypeChange` in
`src/domain/schema/column.ts`; `addKey`/`updateKey`/`removeKey` in
`src/domain/schema/key.ts`) and, critically, on both load paths:
`parseSchemaFile` (`src/domain/schema/integrity.ts`, file import) and
`parseStoredSchema` (`src/infrastructure/localStorageSchemaRepository.ts`,
browser-storage load).

This was flagged as a live gap in 0039's Open Questions and deliberately
left out of that doc's scope: a schema saved before 0039 shipped, or a
hand-crafted/imported file, can carry a `VARCHAR` column with
`size: "abc"`. `ColumnDialog`'s block only stops a user from _typing_ such a
value going forward — it does nothing for a value that arrives via load or
import. That value then round-trips unnoticed through every save/load cycle
until the user happens to open that specific column's dialog, and
PostgreSQL's `generateDdl.ts` would emit it verbatim as `VARCHAR(abc)` if
exported before that.

This follows the same "file it as its own small follow-up" pattern used by
[0038](0038-fk-child-column-size-precision-inheritance.md) for a similar
deferred gap in the same size/precision area — no new `DialectStrategy`
surface is introduced (0039 already added `isSizeValid`/`isPrecisionValid`),
so this doesn't need the explicit `Accepted`-before-code gate that 0039
itself required for its own, larger interface change.

## Goals / Non-Goals

**Goals**

- `normalizeColumnForDialect` clears `size`/`precision` when the value is
  eligible-by-type but fails `config.isSizeValid`/`isPrecisionValid`, using
  the same clearing mechanism (and therefore the same call sites) it
  already uses for type-ineligibility.
- This applies uniformly to every existing call site — table mutators, file
  import, and storage load — since they all funnel through the same
  function.

**Non-Goals**

- Any change to `ColumnDialog`'s live-block UX from 0039 — unaffected.
- SQLite: `isSizeValid`/`isPrecisionValid` both return `() => true` there
  (0039), so this change is a no-op for SQLite in practice. No SQLite
  behavior changes; a test still pins that down explicitly (see Design
  doc's sibling test-plan notes, not duplicated here per the Design Docs
  rule against restating implementation).
- Any UI-visible warning when a load/import silently clears a value — the
  existing type-ineligibility clearing is already silent, and this extends
  the same behavior to the same category of problem. A user-visible
  warning on load would be a separate, larger UX decision out of scope
  here.

## Design

Extend the two ternaries in `normalizeColumnForDialect` to also require
`config.isSizeValid(column.type, column.size)` /
`config.isPrecisionValid(column.type, column.precision)` alongside the
existing `sizableColumnTypes`/`precisionColumnTypes` membership check.
Both validity predicates already treat `""` as valid, so already-empty
values are unaffected.

No new function, no new `DialectStrategy` method — this reuses 0039's
predicates in the one place that was still missing them.

## Alternatives Considered

- **A separate normalization step** (e.g. a new
  `clearMalformedSizeAndPrecision` function called alongside
  `normalizeColumnForDialect` at each call site) — rejected: it solves the
  same problem, in the same category (a column field that shouldn't be
  trusted as-is), so splitting it into a second function/call would
  duplicate the "is this type eligible" check `normalizeColumnForDialect`
  already does, and risks call sites forgetting to invoke the second step.
- **A warning surfaced to the user when load/import clears a value** —
  rejected as out of scope; see Non-Goals. The existing type-ineligibility
  clearing already has no such warning, and adding one only for the
  format-invalid case would be an inconsistent, partial UX improvement.

## Open Questions

None.
