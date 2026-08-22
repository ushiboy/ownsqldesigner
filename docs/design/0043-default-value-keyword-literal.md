# DEFAULT Value: Recognize SQL Keywords as Unquoted

- **Status**: Implemented
- **Created**: 2026-08-22
- **Updated**: 2026-08-22

## Context

[0010](0010-name-validation-and-sql-export.md) left an Open Question: a
`DEFAULT` value meant as an expression or keyword (e.g.
`CURRENT_TIMESTAMP`) is quoted as a string literal by `formatDefaultValue`,
since `Column.defaultValue` is a free-form string with no
literal-vs-expression distinction. Concretely, a user setting a
`created_at` column's default to `CURRENT_TIMESTAMP` today gets
`DEFAULT 'CURRENT_TIMESTAMP'` in the exported DDL — a string literal, not
the evaluated-at-insert-time expression they meant.

## Goals / Non-Goals

**Goals**

- `formatDefaultValue` (duplicated identically today in
  `src/domain/sqlite/generateDdl.ts` and
  `src/domain/postgresql/generateDdl.ts`) emits a fixed, case-insensitive
  set of SQL-standard keywords unquoted: `CURRENT_TIMESTAMP`,
  `CURRENT_DATE`, `CURRENT_TIME`, `NULL`, `TRUE`, `FALSE`.
- No data-model change: `Column.defaultValue` stays a plain string: no new
  field, no schema migration, no new `ColumnDialog` control.

**Non-Goals**

- Arbitrary expressions or function calls (e.g. `gen_random_uuid()`,
  `now() + interval '1 day'`) are not recognized — anything not on the
  fixed keyword list is still quoted as a string literal, exactly as
  before. Handling arbitrary expressions was considered (an explicit
  `isDefaultValueExpression` flag) and rejected — see Alternatives.
- No change to `ColumnDialog`'s default-value input or validation; the
  field remains free-form text, matching 0006's existing "free-form,
  dialect-unenforced" treatment.

## Design

The keyword set is SQL-standard and identical for SQLite and PostgreSQL
(both already accept bare `CURRENT_TIMESTAMP`/`NULL`/`TRUE`/`FALSE` in a
`DEFAULT` clause), so the check is extracted into a single shared helper
rather than duplicated per dialect: `src/domain/dialect/defaultValueFormatting.ts`
exports `formatDefaultValue(raw: string): string`, keeping the existing
numeric-literal check alongside the new keyword check:

```ts
const DEFAULT_VALUE_NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;
const DEFAULT_VALUE_KEYWORDS = new Set([
  "CURRENT_TIMESTAMP",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "NULL",
  "TRUE",
  "FALSE",
]);

export function formatDefaultValue(raw: string): string {
  if (DEFAULT_VALUE_NUMERIC_PATTERN.test(raw) || DEFAULT_VALUE_KEYWORDS.has(raw.toUpperCase())) {
    return raw;
  }
  return `'${raw.replace(/'/g, "''")}'`;
}
```

Matching is case-insensitive (`current_timestamp` matches) but the
original casing is preserved in the output — only whether to quote is
decided by the uppercased comparison. Both dialects' `generateDdl.ts`
import this helper instead of defining their own copy, removing the
pre-existing duplication of the numeric-literal check as a side effect.

## Alternatives Considered

- **An explicit `isDefaultValueExpression: boolean` field on `Column`**,
  surfaced as a `ColumnDialog` checkbox — rejected: it is more general
  (any expression, not just a fixed keyword list) but requires a schema
  migration (a new persisted field defaulted for old saved schemas, same
  pattern as `precision`'s `.default("")`), a new UI control, and shifts
  correctness of the raw SQL entirely onto the user with no validation.
  The fixed keyword list resolves the concretely cited use case
  (`CURRENT_TIMESTAMP`) with zero data-model surface. Revisit if a real
  need for arbitrary expressions (not just standard keywords) appears.
- **Pattern-matching any bare-identifier-shaped value** (e.g.
  `/^[A-Za-z_]\w*$/`) as unquoted — rejected: a literal string default
  that happens to look like an identifier (e.g. `active`, `pending`,
  `yes` — all plausible status-column defaults already in use, see the
  existing `"active"` test case) would silently stop being quoted,
  breaking working schemas. A closed list of actual SQL keywords avoids
  this ambiguity entirely.

## References

- [0010 — Name Validation and SQL Export](0010-name-validation-and-sql-export.md)
  (the Open Question this doc resolves)
