# Domain-Layer Column Normalization

- **Status**: Implemented
- **Created**: 2026-08-14
- **Updated**: 2026-08-14

## Context

[0035](0035-dialect-selector-ui.md) made `ColumnDialog` disable/clear a column's
`size` field for non-sizable types and its `defaultValue` field when
auto-increment is checked and the dialect disallows the combination, but
scoped that enforcement to the interactive dialog only. Its Open Questions
carried forward a gap first flagged in
[0034](0034-postgresql-dialect-strategy.md):

> Should the size/default-value rules also be enforced at the domain layer
> (schema-file import, FK type propagation), the way `normalizeAutoIncrement`
> already is? Today a hand-edited or programmatically-constructed schema
> could still carry an invalid `size`/`defaultValue` combination that only
> `ColumnDialog`'s interactive path prevents.

Concretely, `generateDdl.ts` (both dialects) emits `${type}(${size})`
whenever `size !== ""` with no check that `type` accepts a modifier — a
PostgreSQL schema loaded from a file, or read back from `localStorage`, with
a stale `size` on e.g. a `BOOLEAN` column produced invalid DDL like
`BOOLEAN(5)`. Same story for a `defaultValue` on an auto-increment
PostgreSQL column (identity columns reject an explicit `DEFAULT`).

## Goals / Non-Goals

**Goals**

- Re-derive `size`, `defaultValue`, and `autoIncrement` validity for every
  column at the same points `normalizeAutoIncrement` already ran
  (`updateColumn`, `removeColumn`, FK type-propagation, `addKey`/
  `updateKey`/`removeKey`).
- Extend normalization to the two load paths that previously skipped it
  entirely: `parseSchemaFile` (REQ-027 file import) and the `localStorage`
  repository's `load`.

**Non-Goals**

- Hard validation-failure (rejecting the file/entry) instead of silent
  normalization — rejected for consistency with `normalizeAutoIncrement`'s
  existing precedent (see Design).
- Normalizing in `addColumn` — investigated and deliberately dropped; see
  Alternatives Considered.
- Fixing `addForeignKeyWithNewColumn` dropping the parent's `size` when
  generating a new FK child column referencing a sizable type (e.g.
  `VARCHAR(255)` → sizeless `VARCHAR` child). That's a **fidelity** gap (the
  generated column is always valid by construction, just less faithful to
  the parent), not a **validity** bug the DDL generator can choke on.
- MySQL or other dialects.
- Widening `POSTGRESQL_SIZABLE_COLUMN_TYPES` to cover `TIME`/`TIMESTAMP`'s
  fractional-seconds precision — out of scope for this doc; see Open
  Questions.

## Design

### `normalizeAutoIncrement` → `normalizeColumnForDialect`

`DialectStrategy`'s `normalizeAutoIncrement(table: Table): Table` already
re-derived `autoIncrement` eligibility for every column in one pass, generic
in `src/domain/dialect/dialectStrategy.ts` and parameterized by each
dialect's `isAutoIncrementEligible` predicate. It's renamed to
`normalizeColumnForDialect` and extended, in the same single pass, to also
clear `size` when the column's type isn't in `sizableColumnTypes`, and clear
`defaultValue` when the (already re-derived) `autoIncrement` is `true` and
the dialect's `allowsDefaultWithAutoIncrement` is `false` — both fields the
strategy already carried from 0035, so no new `DialectStrategyConfig` field
was needed:

```ts
function normalizeColumnForDialect(table: Table, config: DialectStrategyConfig): Table {
  const pkColumnId = solePrimaryKeyColumnId(table);
  return {
    ...table,
    columns: table.columns.map((column) => {
      const autoIncrement =
        column.autoIncrement && config.isAutoIncrementEligible(column, pkColumnId);
      return {
        ...column,
        autoIncrement,
        size: config.sizableColumnTypes.includes(column.type) ? column.size : "",
        defaultValue:
          autoIncrement && !config.allowsDefaultWithAutoIncrement ? "" : column.defaultValue,
      };
    }),
  };
}
```

All six existing call sites (`updateColumn`, `removeColumn`,
`propagateColumnTypeChange` in `column.ts`; `addKey`, `updateKey`,
`removeKey` in `key.ts`) were mechanically renamed to call
`normalizeColumnForDialect` instead — unchanged otherwise. This closes the
`propagateColumnTypeChange` gap for free: an FK-cascaded type change now
also re-checks the child's `size` against its new type in the same pass,
instead of leaving a stale value behind.

### Normalizing on load

`parseSchemaFile` (`src/domain/schema/integrity.ts`) already resolved the
schema's `DialectStrategy` via `getDialectStrategy` for
`isSchemaIntegrityValid`. After that structural check passes, its tables are
now mapped through `strategy.normalizeColumnForDialect` before the `Schema`
is returned.

`parseStoredSchema` (`src/infrastructure/localStorageSchemaRepository.ts`)
had no integrity check at all — only `envelopeSchema.safeParse`. It now
resolves the strategy the same way and applies the same per-table
normalization after a successful parse.

Both paths **silently correct** rather than reject — consistent with
`normalizeAutoIncrement`'s existing precedent (an ineligible `autoIncrement`
was already cleared, not treated as a load failure), so `size`/
`defaultValue` gets the same treatment instead of introducing a second
failure mode alongside `isSchemaIntegrityValid`'s hard `null`.

## Alternatives Considered

- **Also normalizing in `addColumn`** — planned initially, since `addColumn`
  was the one mutator that never normalized at all. Rejected after tracing
  `DialogHost.tsx`'s "add column" submit handler: it calls `addColumn` and
  `setColumnKeyMembership` (→ `addKey`) as two **separate** schema
  mutations, specifically so a same-submit auto-increment PK column can
  reference its own not-yet-created id
  (`DialogHost.tsx`'s own comment: "Generated here ... so the same-submit
  key membership can reference this exact column id"). `isAutoIncrementEligible`
  requires `column.id === pkColumnId` — the sole PK's id — which doesn't
  exist yet at the `addColumn` step. Eagerly normalizing there would clear
  `autoIncrement` before the PK key is created, and the later `addKey` call
  can't restore a flag that's already `false` on the stored column. Every
  current `addColumn` caller already passes valid `size`/`defaultValue`
  data (`ColumnDialog`, `addForeignKeyWithNewColumn`), so the gap stays
  latent by construction rather than closed by a normalization pass that
  would break a real workflow.
- **Rejecting invalid files/entries instead of normalizing** — rejected to
  stay consistent with `normalizeAutoIncrement`'s established behavior (see
  Design); a two-tier failure mode (hard reject for structural issues,
  silent fix for value issues) would be an inconsistent user experience for
  no added safety, since the DDL generator only needs the _final_ state to
  be valid.
- **A separate `normalizeSizeAndDefault` function, left independent of
  `normalizeAutoIncrement`** — rejected: `defaultValue`'s validity already
  depends on the _resulting_ `autoIncrement` value, so splitting the two
  would require running them in a fixed order at every call site instead of
  one atomic pass, and 0035 itself named the merged shape
  (`normalizeColumnForDialect`) as the intended follow-up.

## Open Questions

- ~~**`TIME`/`TIMESTAMP` precision support (wanted as a future
  follow-up)** — raised in a cross-session review of this doc: since
  `parseSchemaFile`/ `parseStoredSchema` now normalize on every load, a
  hand-authored schema JSON that sets a `size` on a PostgreSQL
  `TIME`/`TIMESTAMP` column (fractional-seconds precision, e.g.
  `TIMESTAMP(3)`) has it silently cleared, where before this doc it passed
  through untouched by accident. 0035 deliberately excluded both types
  from `sizableColumnTypes` — `size` represents "length" for
  `VARCHAR`/`CHAR`/`NUMERIC`, a different concept from precision, and 0035
  chose not to overload one free-text field with both meanings;
  `ColumnDialog` already disabled/cleared `size` for these types before
  this doc existed, so this normalization is applying that same,
  pre-existing rule consistently rather than introducing a new
  restriction. The user confirmed (2026-08-14): keep this behavior for
  now, but revisit it — a real fix means adding a precision-modifier
  concept distinct from `size` (a new field, or widening what `size`
  means per type), plus a `ColumnDialog` input for it, not just widening
  `sizableColumnTypes` (which would silently reuse the "length" field for
  a different meaning). Track as its own future design doc rather than
  reopening this one.~~ Resolved by
  [0037](0037-time-timestamp-precision.md): a new `Column.precision`
  field, kept distinct from `size`.
- `addForeignKeyWithNewColumn`'s size-fidelity gap (see Non-Goals) could be
  filed as its own follow-up if it turns out to matter in practice.
