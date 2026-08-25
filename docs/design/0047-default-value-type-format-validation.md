# Default Value Type Format Validation

- **Status**: Implemented
- **Created**: 2026-08-23
- **Updated**: 2026-08-23

## Context

[0039](0039-column-size-precision-format-validation.md) added
`DialectStrategy.isSizeValid`/`isPrecisionValid` so `size`/`precision` are
validated against the column's `type` before `ColumnDialog` allows Save,
instead of silently producing broken DDL. `defaultValue` never got the same
treatment: it's a plain free-form text field, and `formatDefaultValue`
(`src/domain/dialect/defaultValueFormatting.ts`, added by
[0043](0043-default-value-keyword-literal.md)) only decides whether to
quote the raw string or emit it as a keyword/number literal — it has no
opinion on whether that literal makes sense for the column's `type`.

This was flagged as an open item in [0006](0006-table-column-management.md)'s
Open Questions ("Whether `size`/`defaultValue` should have any per-type
constraints... is left unresolved") and picked from that list via
`AskUserQuestion`. The `size` half was resolved by 0039/0040; this doc
resolves the `defaultValue` half.

The concrete failure: entering `hello` as the default for a `BOOLEAN`
column, or `abc` for an `INTEGER` column, produces
`DEFAULT 'hello'`/`DEFAULT 'abc'` in the exported PostgreSQL DDL — both
reject at `CREATE TABLE` time, since PostgreSQL cannot implicitly cast
those string literals to `boolean`/`integer`. The app currently offers no
warning before Save or Export.

## Goals / Non-Goals

**Goals**

- Validate `defaultValue`'s format against the column's `type` for
  PostgreSQL's `BOOLEAN` and numeric types (`SMALLINT`, `INTEGER`,
  `BIGINT`, `NUMERIC`, `REAL`, `DOUBLE PRECISION`), the two families where
  a wrong-shaped literal deterministically breaks `CREATE TABLE`.
- Surface the same `ColumnDialog` UX 0039 established: a hint below the
  field and a disabled Save button, not a silent clamp.
- Clear an invalid `defaultValue` on dialect normalization (type change,
  schema import, dialect switch), mirroring
  [0041](0041-normalize-clears-malformed-size-precision.md) for
  size/precision.

**Non-Goals**

- Validating `DATE`/`TIME`/`TIMESTAMP` default literals — PostgreSQL
  accepts a wide range of date/time input formats, and rejecting anything
  not matching one fixed pattern risks false positives on otherwise-valid
  input. Left unvalidated, same as today.
- Validating `UUID`/`JSONB`/`VARCHAR`/`CHAR`/`TEXT` default literals — any
  string is a structurally valid default for these (quoted as-is); there's
  no format to check beyond what already exists.
- SQLite: dynamic typing means any literal is structurally legal for any
  column type, so `isDefaultValueValid` is `() => true` there, same
  pattern `isSizeValid`/`isPrecisionValid` already use for SQLite.
- Semantic/range validation (e.g. rejecting `999999` for a `SMALLINT`'s
  actual range) — out of scope, same restraint 0039 applied to `size`.
- Rejecting a decimal value (e.g. `3.14`) as a default for `SMALLINT`/
  `INTEGER`/`BIGINT` — the shared numeric pattern (see Design) accepts it;
  PostgreSQL itself accepts it too via an assignment cast that rounds, so
  it isn't a `CREATE TABLE`-breaking case like the ones this doc targets,
  just a silent-precision-loss one in the same spirit as 0039's documented
  `NUMERIC(5,10)` scale/precision gap. Deliberately left unvalidated.

## Design

### `DialectStrategy`

Add `isDefaultValueValid(type: string, value: string): boolean`, same
shape as `isSizeValid`/`isPrecisionValid`. Empty string is always valid
(no default set).

0043's `DEFAULT_VALUE_KEYWORDS` are **not** uniformly valid across types —
only `NULL` is meaningful for every type. Scoping matters here: without
it, `isDefaultValueValid("SMALLINT", "TRUE")` would pass and
`formatDefaultValue` would emit it unquoted, producing
`SMALLINT DEFAULT TRUE`, which PostgreSQL rejects (no cast
`boolean → smallint`) — the exact class of bug this doc exists to close,
just reached through a keyword instead of a plain literal. So:

- `NULL`: valid for every type.
- `TRUE` / `FALSE`: valid only for `BOOLEAN` (redundant with, not instead
  of, the `BOOLEAN` literal rule below — both accept the same values).
- `CURRENT_TIMESTAMP` / `CURRENT_DATE` / `CURRENT_TIME`: invalid for
  `BOOLEAN` and the six numeric types below. (They stay valid for every
  other type, since `DATE`/`TIME`/`TIMESTAMP` etc. are Non-Goals and
  remain unvalidated regardless — this scoping only bites for the two
  families actually in scope.)

- **SQLite** (`sqliteDialectStrategy.ts`): `isDefaultValueValid: () => true`.
- **PostgreSQL** (new `isPostgresqlDefaultValueValid` alongside
  `isPostgresqlSizeValid`/`isPostgresqlPrecisionValid` in
  `sizeAndPrecisionValidation.ts`, or a sibling file if that file's name
  stops fitting):
  - `BOOLEAN`: value must match `/^(true|false)$/i`, or be `NULL`
    (case-insensitive).
  - `SMALLINT` / `INTEGER` / `BIGINT` / `NUMERIC` / `REAL` /
    `DOUBLE PRECISION`: value must match `DEFAULT_VALUE_NUMERIC_PATTERN`,
    or be `NULL` (case-insensitive). `DEFAULT_VALUE_NUMERIC_PATTERN` moves
    from a module-local constant to a named export of
    `defaultValueFormatting.ts` so both call sites share one definition —
    the alternative of mirroring a second copy risks the two drifting
    apart, unlike the `size`-vs-`defaultValue` numeric patterns discussed
    under Alternatives Considered, which encode genuinely different
    formats.
  - Every other type: `true` (Non-Goals above) — including the otherwise-
    excluded keywords, since they're only meaningful for these unvalidated
    types anyway.

### `ColumnDialog`

Mirror the existing `size`/`precision` block:

```ts
const isDefaultValueFormatValid = strategy.isDefaultValueValid(fields.type, fields.defaultValue);
```

Show a new `t("defaultValueInvalidFormatHint")` line under the field when
`defaultValueAllowed && !isDefaultValueFormatValid`, and fold
`!isDefaultValueFormatValid` into `isColumnFormInvalid`'s Save-disable
condition, next to the existing size/precision checks.

### `normalizeColumnForDialect`

Extend the existing `defaultValue` branch in
`src/domain/dialect/dialectStrategy.ts` to also clear the value when
`!config.isDefaultValueValid(column.type, column.defaultValue)`, the same
way `size`/`precision` already get cleared when their format is invalid.
This covers type changes made outside `ColumnDialog`'s live validation
(schema import, dialect switch) via the same normalization pass 0041
introduced for size/precision.

### i18n

Add `defaultValueInvalidFormatHint` to `Messages.ts`/`en.ts`/`ja.ts`,
alongside the existing `sizeInvalidFormatHint`/`precisionInvalidFormatHint`
keys.

## Alternatives Considered

- **Validating `DATE`/`TIME`/`TIMESTAMP` literals too** — rejected: unlike
  `size`/`precision` (a small closed format), free-form date/time input
  has many valid PostgreSQL spellings (`2024-01-01`, `January 8, 2024`,
  `now()`-style expressions beyond the 0043 keyword set, etc.); a
  hand-rolled pattern would reject valid input more often than it catches
  real mistakes.
- **Coercing instead of blocking** (e.g. silently stripping non-numeric
  characters) — rejected for the same reason 0039 rejected clamping:
  surprising silent data loss instead of a visible, actionable hint.
- **A single shared numeric/boolean regex module reused by both `size`
  validation and this** — considered, but `size` validation's numeric
  pattern (`NUMERIC_SIZE_PATTERN`, allows a comma-separated scale) and
  `defaultValue`'s numeric pattern (`DEFAULT_VALUE_NUMERIC_PATTERN`, a
  plain signed decimal) mean different things; sharing one regex would
  couple two unrelated formats that happen to look similar today.

## Open Questions

- Whether `UUID`'s default should eventually validate against a UUID
  shape (or the `gen_random_uuid()`-style expression forms PostgreSQL
  users commonly reach for) — deferred; no evidence yet that free-form
  `UUID` defaults are a real source of broken DDL in practice.
