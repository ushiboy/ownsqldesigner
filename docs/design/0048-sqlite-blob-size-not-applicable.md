# SQLite BLOB Size Not Applicable

- **Status**: Accepted
- **Created**: 2026-08-25
- **Updated**: 2026-08-25

## Context

[0006](0006-table-column-management.md) left an open question: "Whether
`size`/`defaultValue` should have any per-type constraints (e.g. disabling
`size` for `BLOB`) is left unresolved; both are plain free-form text fields
for now." The `defaultValue` half was resolved by
[0047](0047-default-value-type-format-validation.md). This doc resolves the
`size`/`BLOB` half, picked via `AskUserQuestion` from a survey of every
design doc's Open Questions.

Today, SQLite's `sizableColumnTypes` config includes all 5 SQLite column
types (`INTEGER`, `TEXT`, `REAL`, `BLOB`, `NUMERIC`), so `ColumnDialog`
treats `size` as applicable for `BLOB` too. A user can type e.g. `10` into
Size for a BLOB column, and it round-trips silently into `BLOB(10)` in the
exported SQLite DDL (`src/domain/sqlite/generateDdl.ts`'s
`generateColumnDefinition`, which unconditionally renders `${type}(${size})`
whenever `column.size !== ""`).

This is not a SQL-syntax-validity bug — SQLite's loose column-type parsing
accepts `BLOB(n)` without erring, and `CREATE TABLE` would not fail. It's a
_meaningless modifier_ bug: SQLite's type-affinity/storage layer ignores any
length spec on BLOB entirely regardless of what's declared, so exporting
`BLOB(n)` is misleading DDL, not broken DDL. This is unlike SQLite's other 4
types, where `size` is at least a documentation-only hint kept "for
documentation and future dialects" (per 0006's own text) — a length modifier
is never meaningful for a blob, under any current or foreseeable dialect.

PostgreSQL has no binary/`BYTEA` column type anywhere in this codebase
today, so this change is SQLite-only — there's no cross-dialect symmetry to
add on the PostgreSQL side right now. See Open Questions for how this
extends when that changes.

## Goals / Non-Goals

**Goals**

- Disable `Column.size` for SQLite's `BLOB` type in `ColumnDialog`, showing
  the existing `sizeNotApplicableHint`.
- Clear a `BLOB` column's `size` on dialect normalization (type switch in
  `ColumnDialog`, schema import, or any other call site of
  `normalizeColumnForDialect`) via the existing generic mechanism.

**Non-Goals**

- Any format validation for SQLite `size` — `isSizeValid` stays
  `() => true`. This is purely an eligibility change, not a reversal of
  0039's "SQLite opts out of format validation" decision.
- Any PostgreSQL change — PostgreSQL has no binary/`BYTEA` type in this
  codebase, so there's no cross-dialect symmetry to add.
- Disabling `size` for any other SQLite type — `INTEGER`, `TEXT`, `REAL`,
  `NUMERIC` all remain sizable; SQLite's type-affinity looseness still
  applies to them, unlike `BLOB`.
- `defaultValue` constraints for `BLOB` — out of scope, follows 0047's
  existing SQLite-wide `isDefaultValueValid: () => true` opt-out.
- Removing `BLOB` from `SQLITE_COLUMN_TYPES` — `BLOB` remains a fully valid
  column type, just not a sizable one.
- **A `CHECK`-based actual length-constraint feature** (e.g.
  `CHECK (length(col) <= n)`) for BLOB or PostgreSQL `bytea` columns. This
  was raised as a review-lens question and explicitly considered — see
  Alternatives Considered. It's a materially larger feature (a new kind of
  schema constraint, UI for entering a limit, dialect-specific DDL
  generation) than what 0006's open question actually asked for, which was
  specifically "disabling `size`."

## Design

### Data model

Add `SQLITE_SIZABLE_COLUMN_TYPES` to `src/domain/sqlite/columnTypes.ts`
(`["INTEGER", "TEXT", "REAL", "NUMERIC"]`), mirroring
`POSTGRESQL_SIZABLE_COLUMN_TYPES`'s naming and placement in
`src/domain/postgresql/columnTypes.ts`. `SQLITE_COLUMN_TYPES` (all 5,
`BLOB` included) is untouched.

### `sqliteDialectStrategy`

`sizableColumnTypes: SQLITE_COLUMN_TYPES` becomes
`sizableColumnTypes: SQLITE_SIZABLE_COLUMN_TYPES`. `columnTypes` and
`isSizeValid` are untouched.

### `ColumnDialog` and `normalizeColumnForDialect`

No code change in either. `ColumnDialog.tsx`'s
`sizeAllowed = strategy.sizableColumnTypes.includes(fields.type)` already
drives disabling the Size input, showing `sizeNotApplicableHint`, clearing
`size` on type-switch, and clamping on submit — this is the same generic
mechanism 0039 built for PostgreSQL. `normalizeColumnForDialect`
(`src/domain/dialect/dialectStrategy.ts`) already gates size-clearing on
`config.sizableColumnTypes.includes(column.type)`, so a `BLOB` column's
`size` is cleared automatically once the config changes. No new i18n key is
needed — `sizeNotApplicableHint` ("This column type does not accept a
size." / "このカラム型にはサイズを指定できません。") already exists and is generic.

## Alternatives Considered

- **A `BLOB`-specific branch inside `isSizeValid`** (treating any non-empty
  value as a format error) — rejected: conflates eligibility with format,
  same reasoning 0039 used to reject folding validation into the sizable-
  types list. SQLite's `isSizeValid` is deliberately `() => true`
  everywhere per 0039; this would break that uniform opt-out for no
  benefit — the "not applicable" hint is a strictly better UX than a
  wrong-in-general "invalid format" hint.
- **A `nonSizableColumnTypes` exclusion list instead of extending the
  established `sizableColumnTypes` inclusion-list shape** — rejected:
  `sizableColumnTypes` is the established shape across both dialects
  (`DialectStrategyConfig`); switching representations for one dialect only
  would break the "same shape, different data" symmetry that lets
  `ColumnDialog`/`normalizeColumnForDialect` stay dialect-agnostic.
- **Removing `BLOB` from `columnTypes` entirely** — rejected: `BLOB` is a
  legitimate, commonly-used SQLite storage class; only its sizability
  changes, not its validity as a column type.
- **A `CHECK`-based real length-constraint feature for BLOB/`bytea`** —
  rejected as out of scope for this doc: it's a significantly larger
  feature (a new kind of schema constraint, new UI for entering a limit,
  dialect-specific DDL generation for both SQLite's `length()` function and
  PostgreSQL's `octet_length()`), and not what 0006's open question or the
  `AskUserQuestion` round that picked this item actually asked for. Could
  be a future doc in its own right if ever requested.

## Open Questions

- If PostgreSQL ever gains a binary column type (`BYTEA`/`BINARY`) — noted
  as a direction the user wants to keep open, not committed to yet — this
  doc's mechanism generalizes directly: add the type to
  `POSTGRESQL_COLUMN_TYPES` and simply don't add it to
  `POSTGRESQL_SIZABLE_COLUMN_TYPES`, the same eligibility-list exclusion
  already used for `BOOLEAN`/`DATE`/etc. No change to `ColumnDialog` or
  `normalizeColumnForDialect` would be needed then either, for the same
  reason none was needed here.
