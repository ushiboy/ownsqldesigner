# SQL Reserved Keyword Rejection

- **Status**: Implemented
- **Created**: 2026-08-09
- **Updated**: 2026-08-09

## Context

[0010](0010-name-validation-and-sql-export.md) (name validation and SQL
export) built `generateSqliteDdl` around an unquoted-identifier
architecture: `isValidIdentifierName` only accepts
`/^[A-Za-z_][A-Za-z0-9_]*$/`, so a valid name is guaranteed emittable
verbatim, with no dialect-specific quoting/escaping logic anywhere in the
generator. That doc explicitly left one gap open: a name that is a SQL
reserved keyword (e.g. a table named `order`) currently passes
`isValidIdentifierName` and would produce broken, unquoted DDL such as
`CREATE TABLE order (...)`. 0010 considered and rejected quoting
identifiers as the fix (it would push dialect-specific quoting logic into
every future dialect's generator) and deferred a reserved-keyword denylist
as out of scope for that round, without ruling it out for later.

All 28 design docs that existed before this one are `Status: Implemented`
and every requirement in `docs/requirements.md` links to one, so this is
not new feature work — it's a follow-up correctness fix closing an
Open Question left by an already-shipped doc, hence its own new sequence
number rather than an edit to 0010 in place, per
`docs/rules/design-docs.md`'s rule that a genuinely later round of work
gets a new doc once the original has shipped.

## Goals / Non-Goals

**Goals**

- A table or column name that is a SQL reserved keyword is treated as an
  invalid name, the same way an empty or already-used name is today
  (REQ-018/019/023).
- The rejection is dialect-specific: the keyword set lives behind
  [0026](0026-sql-dialect-strategy.md)'s `DialectStrategy`, not hardcoded
  into dialect-agnostic validation code.
- A schema loaded from an external file with a reserved-keyword name is
  rejected the same way one entered through the UI is (REQ-018/019, via
  `parseSchemaFile`).

**Non-Goals**

- Identifier quoting/escaping in generated SQL — 0010's rejection of this
  approach stands; this doc keeps the no-quoting architecture intact by
  rejecting the name instead of quoting it.
- A configurable or per-dialect-editable keyword list beyond SQLite's own —
  SQLite is the only dialect that exists today.

## Design

### Keyword data

New `src/domain/sqlite/reservedKeywords.ts`, mirroring the existing
`nameComparison.ts` module (small, single-purpose, own test file):
a `Set<string>` of every keyword from
[SQLite's own keyword list](https://www.sqlite.org/lang_keywords.html)
(uppercased), and `isSqliteReservedKeyword(name)`, which uppercases its
input and checks Set membership — the same case-insensitive-comparison
shape `isSqliteNameTaken` already uses.

### `DialectStrategy` wiring

`DialectStrategy` and `DialectStrategyConfig`
(`src/domain/dialect/dialectStrategy.ts`) both gain
`isReservedKeyword(name: string): boolean`, threaded through
`buildDialectStrategy` as a straight pass-through — the same atomic-rule
category as the existing `isNameTaken`, not a derived/wrapped rule like
`hasDuplicateNames`. `sqliteDialectStrategy.ts` supplies
`isSqliteReservedKeyword`.

### Validation and integrity layers

`src/domain/schema/validation.ts`: `isTableNameAvailable` and
`isColumnNameAvailable` each gain `&& !strategy.isReservedKeyword(name)`
alongside their existing `isValidIdentifierName` and `isNameTaken` checks.
This also covers `createTable`/`renameTable`/`addColumn`/`updateColumn`'s
existing no-op guards for free, since those already call through these two
predicates per 0010.

`NameValidity` gains `isReserved: boolean`. `describeNameValidity` computes
it right after the shape check and before the duplicate check
(`!isEmpty && !isInvalidShape && strategy.isReservedKeyword(...)`), and
`isDuplicate` gains `&& !isReserved` so the flags stay mutually exclusive —
matching the existing empty → invalid-shape → duplicate precedence.

`src/domain/schema/integrity.ts`: `isSchemaIntegrityValid` and
`isTableIntegrityValid` — which check `isValidIdentifierName` directly
against every table/column name in a whole schema, and which
`parseSchemaFile` relies on to reject a bad imported JSON file — gain the
same `&& !strategy.isReservedKeyword(name)` check. Without this, a
hand-edited or externally produced schema file with a reserved-keyword name
could be imported and would silently produce broken SQL on export, even
though the same name is now rejected everywhere in the UI.

### UI feedback

New `common.reservedNameHint` message (`Messages.ts`, `en.ts`, `ja.ts`).
The three existing name-input call sites — `TableNameDialog.tsx`,
`ColumnDialog.tsx`, and `SidePanel.tsx`'s inline table-rename field — each
destructure the new `isReserved` field from `describeNameValidity`'s result
and render one more conditional hint `<p>`, positioned between the existing
invalid-shape and duplicate hints, with the same disabled-submit wiring
(already covered by `isInvalid`, or an explicit `isReserved` term where a
component checks flags individually rather than via `isInvalid`).

## Alternatives Considered

- **Quoting identifiers instead of rejecting reserved-keyword names** —
  rejected, continuing 0010's existing reasoning: it would require every
  future dialect's DDL generator to carry quoting/escaping logic for a
  problem that rejection avoids entirely. Rejection also keeps the
  guarantee "a valid name is emittable verbatim" true without exception,
  rather than true-except-for-keywords.
- **Hardcoding the keyword check directly into `isValidIdentifierName`**
  — rejected: that function is dialect-agnostic (no `DialectStrategy`
  parameter) and reused by `integrity.ts` outside any per-dialect context
  in a couple of call sites; a reserved-keyword set is inherently
  dialect-specific (SQLite's keyword list differs from MySQL's, Postgres's,
  etc.), so it belongs behind `DialectStrategy` alongside `isNameTaken`,
  matching 0026's existing atomic-rule/generic-wrapper split.
- **Leaving `isSchemaIntegrityValid`/`isTableIntegrityValid` unchanged** —
  considered, since the Open Question this doc closes was raised in the
  context of UI-driven name entry. Rejected: `parseSchemaFile` uses the same
  integrity check to gate file import (REQ-027), so leaving it unchanged
  would reopen the same broken-DDL gap through a different, still-reachable
  path.

## References

- [0010 — Name Validation and SQL Export](0010-name-validation-and-sql-export.md)
- [0026 — SQL Dialect Strategy](0026-sql-dialect-strategy.md)
- [SQLite Keywords](https://www.sqlite.org/lang_keywords.html)
