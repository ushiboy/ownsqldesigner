# TIME/TIMESTAMP Precision

- **Status**: Implemented
- **Created**: 2026-08-14
- **Updated**: 2026-08-14

## Context

[0035](0035-dialect-selector-ui.md) deliberately excluded PostgreSQL's
`TIME`/`TIMESTAMP` from `sizableColumnTypes`: `size` represents "length"
for `VARCHAR`/`CHAR`/`NUMERIC`, a different concept from the
fractional-seconds precision these two types accept (e.g. `TIMESTAMP(3)`).
[0036](0036-domain-layer-column-normalization.md) then made that exclusion
load-bearing everywhere, not just in `ColumnDialog`: `parseSchemaFile`/
`parseStoredSchema` now silently clear `size` on a `TIME`/`TIMESTAMP`
column on every load. Net effect: there is currently no way to express
precision on these types at all, even though PostgreSQL supports it. 0036's
Open Questions named the fix and deferred it here:

> a real fix means adding a precision-modifier concept distinct from
> `size` (a new field, or widening what `size` means per type), plus a
> `ColumnDialog` input for it, not just widening `sizableColumnTypes`
> (which would silently reuse the "length" field for a different meaning).
> Track as its own future design doc rather than reopening this one.

This doc is that follow-up: a new `precision` field, kept fully separate
from `size`.

## Goals / Non-Goals

**Goals**

- A new `Column.precision: string` field (free-form text, same style as
  `size`), settable only on PostgreSQL `TIME`/`TIMESTAMP` columns.
- `DialectStrategy` gains `precisionColumnTypes`, so eligibility is
  dialect-owned like `sizableColumnTypes` already is (SQLite: `[]`, since
  it has neither type).
- `normalizeColumnForDialect` re-derives `precision` validity at the same
  points it already re-derives `size`/`autoIncrement`/`defaultValue` — the
  six existing domain call sites, plus both load paths (`parseSchemaFile`,
  `parseStoredSchema`) — so this closes the gap everywhere at once, not
  just in the interactive dialog.
- DDL generation and the canvas type-label toggle (REQ-012) render
  `TIMESTAMP(3)`/`TIME(3)` when `precision` is set.
- `ColumnDialog` gains a "Precision" input, mirroring the existing "Size"
  input's disabled/hint/immediate-clear-on-type-change behavior (the UX
  0035/0036 already established for `size`).

**Non-Goals**

- Widening `sizableColumnTypes` or otherwise reusing `size` — the whole
  point of this doc is to keep the two concepts apart (see Alternatives
  Considered).
- `WITH TIME ZONE` variants or any other PostgreSQL temporal type — out of
  scope, consistent with 0034's "practical subset" Non-Goal.
- SQLite (no `TIME`/`TIMESTAMP` type exists there).
- Numeric range validation (PostgreSQL allows 0-6) on the precision value —
  `size` is already unvalidated free text; `precision` follows the same
  precedent rather than introducing a new validation tier for one field.

## Design

### Data model

`src/domain/schema/types.ts`'s `columnSchema` gains
`precision: z.string().default("")`, next to `size`. The `.default("")` is
required for backward compatibility — every schema saved before this doc
lacks the field entirely.

### `DialectStrategy`

`src/domain/dialect/dialectStrategy.ts`'s `DialectStrategy` and
`DialectStrategyConfig` both gain `precisionColumnTypes: readonly string[]`,
plumbed through `buildDialectStrategy` exactly like `sizableColumnTypes`.
`normalizeColumnForDialect` (the shared private helper) gains one more
field on its per-column map:

```ts
precision: config.precisionColumnTypes.includes(column.type) ? column.precision : "",
```

`src/domain/postgresql/columnTypes.ts` gains
`POSTGRESQL_PRECISION_COLUMN_TYPES = ["TIME", "TIMESTAMP"]`, wired into
`postgresqlDialectStrategy.ts`. `sqliteDialectStrategy.ts` passes `[]`.

### DDL generation and canvas display

`size` and `precision` are mutually exclusive by construction — a type is
either in `sizableColumnTypes` or `precisionColumnTypes`, never both, and
normalization already guarantees only the applicable one is ever non-empty.
Every place that currently formats `${type}(${size})` picks whichever
modifier is set instead:

```ts
const modifier = column.size !== "" ? column.size : column.precision;
const type = modifier === "" ? column.type : `${column.type}(${modifier})`;
```

This logic exists in three intentionally-duplicated copies today (per
their own "avoids circular import" comments), all updated the same way:
`src/domain/schema/column.ts`'s `formatColumnType` (feeds `Canvas.tsx`'s
REQ-012 type-label display), `src/domain/postgresql/generateDdl.ts`'s
`generateColumnDefinition`, and `src/domain/sqlite/generateDdl.ts`'s
(a no-op there, since SQLite columns never have a non-empty `precision`,
but kept in lockstep with the other two).

### `ColumnDialog` UI

A new "Precision" field is added next to "Size" in
`src/pages/MainScreen/components/ColumnDialog/ColumnDialog.tsx`, built the
same way:

- `precisionAllowed = strategy.precisionColumnTypes.includes(fields.type)`.
- Input disabled + hint (`precisionNotApplicableHint`) when not allowed.
- The type `<select>`'s `onChange` clears `precision` immediately (same
  branch that already clears `size`) when the newly selected type isn't in
  `precisionColumnTypes`.
- Submit clamps `precision` to `""` when not allowed, as a safety net.

### i18n

`columnDialog.precisionLabel` / `precisionNotApplicableHint` are added to
`Messages.ts`, `en.ts`, and `ja.ts`, matching the existing `sizeLabel` /
`sizeNotApplicableHint` entries.

## Alternatives Considered

- **Widen `sizableColumnTypes` to include `TIME`/`TIMESTAMP` and reuse
  `size`** — this is exactly what 0035/0036 rejected: `size` means
  "length" everywhere else it's used (UI hint text, the mental model of
  the field), and overloading it for "precision" on two types would be a
  silent, undocumented meaning-shift future readers wouldn't expect.
- **A single generic "modifier" field replacing both `size` and
  `precision`** — rejected: it would require every existing call site
  (`ColumnDialog`, both DDL generators, `formatColumnType`, normalization)
  to know which semantic meaning applies per type anyway, so it saves no
  real complexity over two clearly-named fields, while losing the
  self-documenting field names in the schema and in `ColumnDialog`'s UI
  labels.

## Open Questions

Raised in a cross-session peer review (2026-08-14) — both non-blocking,
neither found any correctness gap introduced by this doc:

- **No numeric validation on `precision`** (PostgreSQL's valid range is
  0-6). It stays free-form text, same as `size` — a deliberate choice, not
  an oversight (see Non-Goals). An invalid value (e.g. `"abc"`, `"99"`)
  still round-trips into broken DDL like `TIMESTAMP(abc)`. Revisit only if
  this proves to matter in practice; would need a validation-tier decision
  shared with `size`, not a precision-only fix.
- ~~**`addColumn` still doesn't call `normalizeColumnForDialect`** (pre-existing
  behavior, not introduced here) — unlike `updateColumn`/`removeColumn`, so
  a hypothetical caller that bypasses `ColumnDialog`'s own clamp could add a
  column with an invalid `size`/`precision` combination. Same class of gap
  0036's Alternatives Considered already documented and deliberately left
  open (see 0036's `addColumn` discussion) — not new to this doc.~~ Resolved
  2026-08-14: `addColumn` gained a `normalize` option (default `true`) that
  wraps its table update in `strategy.normalizeColumnForDialect`, matching
  `updateColumn`/`removeColumn`. This closes the gap for every caller except
  one: `useUndoableSchema.ts`'s `addColumn` action explicitly passes
  `normalize: false`, because it creates the column and assigns its
  PRIMARY KEY in two separate, back-to-back calls (mirroring `ColumnDialog`'s
  real submit) — normalizing eagerly would clear a same-submit
  auto-increment flag before the key exists, exactly the regression 0036's
  Alternatives Considered predicted for this idea. A regression test
  (`useUndoableSchema.test.tsx`) reproduces and guards this case.

  This initial resolution missed that `updateColumn` has the identical
  gap: `DialogHost.tsx`'s `editColumn` submit calls `onUpdateColumn` then
  `onSetColumnKeyMembership` — the same two-step pattern as `addColumn`'s
  — but `updateColumn` normalized unconditionally with no opt-out. Caught
  by a cross-session peer review (2026-08-15) and reproduced (an existing
  INTEGER column, checking Auto Increment + Primary Key together in
  `ColumnDialog`, lost `autoIncrement` on save). Fixed the same way:
  `updateColumn` gained a matching `normalize` option (default `true`),
  and `useUndoableSchema.ts`'s `updateColumn` action — whose sole caller
  is that same `editColumn` submit, unconditionally followed by
  `setColumnKeyMembership` — passes `normalize: false`. A one-`commitEdit`
  consolidation (folding `setColumnKeyMembership` into the `addColumn`/
  `updateColumn` actions) was considered instead, but rejected: it would
  collapse the two actions' undo entries into one, changing undo/redo
  granularity as documented in `useUndoableSchema.ts`'s own reducer-choice
  comment and pinned by an existing test
  ("chains two edits dispatched synchronously ... into two undo steps") —
  out of scope for a normalization-ordering fix. A matching regression
  test was added to `useUndoableSchema.test.tsx`.
