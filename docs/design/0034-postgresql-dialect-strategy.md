# PostgreSQL Dialect Strategy

- **Status**: Implemented
- **Created**: 2026-08-13
- **Updated**: 2026-08-13

## Context

[0026](0026-sql-dialect-strategy.md) extracted all SQLite-specific behavior
into a `DialectStrategy` interface specifically to prepare for a second
dialect, and said so explicitly: "This is stage 1 of adding MySQL/PostgreSQL
support... SQLite remains the only concrete strategy — no MySQL/PostgreSQL
strategy is implemented yet." This doc is that stage 2: a concrete
PostgreSQL `DialectStrategy`, registered alongside SQLite in
`dialectRegistry.ts`.

Scope is deliberately narrow: **domain layer only**. No dialect-selector UI
is added (schema creation dialog, settings). 0026 itself rejected adding a
selector early — "an already-decided-for-the-user dropdown adds UI surface
with no present value; add it when a second dialect ships" — so this change
ships the dialect first and defers the picker to a follow-up. From an
end-user perspective nothing changes: there is still no way to create a
schema with any dialect but SQLite (`DEFAULT_SQL_DIALECT` stays `"sqlite"`,
and no call site passes `dialect` explicitly), so `requirements.md`'s
Non-Goal "Dialects other than SQLite" remains true in practice.

## Goals / Non-Goals

**Goals**

- A `postgresqlDialectStrategy` implementing the full `DialectStrategy`
  interface (column types, auto-increment eligibility, name comparison,
  reserved-keyword rejection, DDL generation), registered in
  `dialectRegistry.ts`.
- `SqlDialect` gains `"postgresql"`.
- Full unit test coverage mirroring the SQLite module's test files.

**Non-Goals**

- A dialect-selector UI (schema creation dialog, settings page, ...) —
  deferred to a follow-up requirement once this ships.
- MySQL support.
- Exhaustive PostgreSQL type coverage — arrays, ranges, enums, network
  types (`inet`, `cidr`), and the `JSON`/`JSONB` distinction are out of
  scope; a practical subset is used instead (see Design).
- Quoted-identifier support — as with SQLite (0010's Alternatives
  Considered), only bare identifiers are supported, so PostgreSQL's
  case-folding of unquoted identifiers is treated as equivalent to
  case-insensitive name comparison.

## Design

`src/domain/postgresql/` mirrors `src/domain/sqlite/` file-for-file:
`columnTypes.ts`, `autoIncrement.ts`, `nameComparison.ts`,
`reservedKeywords.ts`, `generateDdl.ts`, and
`postgresqlDialectStrategy.ts` (assembled via the existing
`buildDialectStrategy` helper — no changes to `dialectStrategy.ts` itself).

### Column types

A practical, non-exhaustive subset: `SMALLINT`, `INTEGER`, `BIGINT`,
`NUMERIC`, `REAL`, `DOUBLE PRECISION`, `BOOLEAN`, `VARCHAR`, `CHAR`, `TEXT`,
`DATE`, `TIME`, `TIMESTAMP`, `UUID`, `JSONB`.

### Auto-increment

PostgreSQL has no `AUTOINCREMENT` keyword. Modern PostgreSQL uses
`GENERATED ALWAYS AS IDENTITY` on the column — and, unlike SQLite's inline
`PRIMARY KEY AUTOINCREMENT`, an identity column does **not** imply
`PRIMARY KEY`. `generatePostgresqlDdl`'s `generatePrimaryKeyConstraint`
therefore always emits the table-level `PRIMARY KEY (...)` constraint when
a `PRIMARY_KEY` key exists, regardless of `autoIncrement` — unlike SQLite's
generator, which skips it when an autoincrement column already declares the
constraint inline. Eligibility (`isPostgresqlAutoIncrementEligible`)
allows a sole `SMALLINT`, `INTEGER`, or `BIGINT` primary-key column —
wider than SQLite's `INTEGER`-only rule, since PostgreSQL has no
equivalent restriction: `SMALLINT`/`INTEGER`/`BIGINT` are the
`SMALLSERIAL`/`SERIAL`/`BIGSERIAL`-equivalent types when combined with
`GENERATED ALWAYS AS IDENTITY`, and all three are legitimate surrogate-key
choices depending on the expected table size. The eligible type set is
exposed on `DialectStrategy` as `autoIncrementEligibleColumnTypes`, so UI
copy (e.g. `ColumnDialog`'s auto-increment hint) can name the correct
type(s) per dialect instead of hardcoding `INTEGER`.

An identity column also cannot carry an explicit `DEFAULT` clause —
PostgreSQL rejects `GENERATED ALWAYS AS IDENTITY ... DEFAULT ...` as a
syntax error (unlike SQLite, which tolerates `PRIMARY KEY AUTOINCREMENT
... DEFAULT ...`). `generateColumnDefinition` therefore suppresses the
`DEFAULT` clause whenever `autoIncrement` is set, regardless of whether
`defaultValue` is populated.

### Name comparison and reserved keywords

`isPostgresqlNameTaken` does a case-insensitive comparison, matching
PostgreSQL's own folding of unquoted identifiers to lowercase.
`isPostgresqlReservedKeyword` checks PostgreSQL's "reserved" and "reserved
(can be function or type name)" keyword categories (per PostgreSQL's own
keyword appendix) — the categories that cannot be used as an unquoted
identifier at all. This is not exhaustive of every PostgreSQL keyword (many
are only "non-reserved" and remain usable as bare identifiers).

## Alternatives Considered

- **`SERIAL`/`BIGSERIAL` pseudo-types for auto-increment** — rejected in
  favor of `GENERATED ALWAYS AS IDENTITY`: `SERIAL` is a type-substitution
  trick (it silently swaps the declared column type and attaches a
  sequence + default), which fits poorly with this app's domain model where
  `autoIncrement` is an orthogonal boolean on any integer-typed column.
  `GENERATED ALWAYS AS IDENTITY` is also the modern, documented-preferred
  approach in current PostgreSQL.
- **Adding a dialect-selector UI in this same change** — rejected: kept
  strictly to the domain layer per the explicit scope decision for this
  change: ship the strategy, defer the picker.

## Open Questions

Flagged during review; deferred until a dialect-selector UI actually makes
PostgreSQL reachable (at which point they stop being purely theoretical):

- ~~**BIGINT identity eligibility**: `isPostgresqlAutoIncrementEligible` only
  allows `INTEGER`, mirroring SQLite's own constraint. PostgreSQL has no
  such restriction, and `BIGINT` (the `BIGSERIAL`-equivalent) is the common
  choice for surrogate keys on large tables. Widening the check to
  `INTEGER || BIGINT` is a small change, worth revisiting once PostgreSQL
  is user-selectable.~~ Resolved 2026-08-13: `isPostgresqlAutoIncrementEligible`
  now allows `SMALLINT || INTEGER || BIGINT` — widened to `INTEGER || BIGINT`
  first, then to also include `SMALLINT` after a same-day review raised it
  as a gap (PostgreSQL's `SMALLSERIAL` is an equally legitimate identity
  type); see the updated Auto-increment section above.
- **Type-conditional `size` validation**: `ColumnDialog`'s `size` field is a
  free-text input regardless of column type. For PostgreSQL, types that
  take no modifier (`BOOLEAN`, `INTEGER`, `UUID`, `JSONB`, `DATE`, `TEXT`,
  ...) produce invalid DDL like `BOOLEAN(5)` if a size is entered. Harmless
  under SQLite's looser grammar, but will need type-aware
  disable/validation in the UI once PostgreSQL is actually selectable.
- **Silent default-value drop on identity columns**: since this change
  suppresses `DEFAULT` for any `autoIncrement` column (see Auto-increment
  above), a user who fills in both fields today gets no error or warning —
  the default value is simply absent from the exported DDL. Acceptable at
  the domain-only stage (nothing surfaces PostgreSQL DDL to a user yet),
  but once a dialect-selector UI ships, `ColumnDialog` should probably
  disable/clear the default-value field when auto-increment is checked, or
  surface a validation message.
