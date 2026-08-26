# PostgreSQL BYTEA Column Type

- **Status**: Implemented
- **Created**: 2026-08-26
- **Updated**: 2026-08-26

## Context

[0048](0048-sqlite-blob-size-not-applicable.md) left an Open Question: if
PostgreSQL ever gains a binary column type (`BYTEA`/`BINARY`), its
mechanism generalizes directly — add the type to `POSTGRESQL_COLUMN_TYPES`
and simply don't add it to `POSTGRESQL_SIZABLE_COLUMN_TYPES`. At the time,
the user said PostgreSQL binary support wasn't wanted yet but should be
kept possible later. This doc picks that up, chosen via `AskUserQuestion`
from a survey of every design doc's Open Questions alongside two other
still-open items (0002/0003's dropdown keyboard navigation, 0007's
`addKey`/`updateKey` defensive `columnIds` filtering — both remain open).

`bytea` is PostgreSQL's only built-in binary string column type. PostgreSQL
also has a "Large Object" facility (an `oid` column referencing
`pg_largeobject`, accessed via `lo_import`/`lo_export` and friends), but
that's a session/transaction-bound API for very large payloads, not a
plain column type that fits this app's "pick from a type list" model — so
it's out of scope here.

A read-only review of `src/domain/postgresql/*` confirmed every relevant
piece of PostgreSQL dialect plumbing is already generic over the
type-eligibility lists: `postgresqlDialectStrategy.ts` wires
`columnTypes`/`sizableColumnTypes`/`precisionColumnTypes` straight from the
constants file; `isSizeValid`/`isPrecisionValid`
(`sizeAndPrecisionValidation.ts`) and `isDefaultValueValid`
(`defaultValueValidation.ts`) fall through to `true` for any type not
explicitly branched; `generateDdl.ts` renders `column.type` with no
per-type branches; `ColumnDialog.tsx` derives its type `<select>` and
field-clearing purely from the strategy's eligibility lists. So this is a
small, mechanically-scoped addition.

## Goals / Non-Goals

**Goals**

- Add `BYTEA` as a selectable PostgreSQL column type.
- `BYTEA` columns get no size or precision modifier (mirrors SQLite
  `BLOB`'s 0048 treatment).

**Non-Goals**

- Any other PostgreSQL binary type — `bytea` is the only built-in one that
  fits this app's column-type-list model; the Large Object facility is a
  separate, non-column-type mechanism (see Context).
- Format validation for `BYTEA` default values — falls into the existing
  generic pass-through (same as every other non-`BOOLEAN`, non-numeric
  PostgreSQL type today), just quoted as a string literal by
  `formatDefaultValue`. This isn't quite the same risk profile as other
  free-input types like `VARCHAR`/`TEXT`, though: PostgreSQL's `bytea`
  traditional-escape input format accepts printable characters mostly
  as-is (so most free-form defaults produce valid DDL), but it does _not_
  accept a bare backslash — only `\\` or a `\NNN` octal escape. A default
  value containing a lone `\` (e.g. `C:\path`) would produce DDL that
  errors if actually run against PostgreSQL. Accepted as a known, `bytea`-
  specific edge case: this tool only generates DDL, it doesn't execute it,
  so the cost of getting this wrong is a copy-paste failure the user can
  fix, not silent data corruption. Revisit if this proves confusing in
  practice.
- Any SQLite-side change — SQLite already has `BLOB`.
- Any `ColumnDialog`/`normalizeColumnForDialect`/`generateDdl` code change
  — all three are already generic over the eligibility lists.

## Design

### Data model

Append `"BYTEA"` to `POSTGRESQL_COLUMN_TYPES`
(`src/domain/postgresql/columnTypes.ts`), following the established
"append newest at the end" convention (UUID, then JSONB, now BYTEA). Do
**not** add it to `POSTGRESQL_SIZABLE_COLUMN_TYPES`,
`POSTGRESQL_PRECISION_COLUMN_TYPES`, or `POSTGRESQL_NUMERIC_COLUMN_TYPES`.

### `postgresqlDialectStrategy` / `ColumnDialog` / `normalizeColumnForDialect`

No code change in any of them. All three already derive their behavior
generically from the eligibility lists above — the same mechanism that
already excludes `BOOLEAN`/`DATE`/`UUID`/etc. from size and precision
handles `BYTEA` for free.

## Alternatives Considered

- **A `BYTEA`-specific branch in `isDefaultValueValid` validating the
  traditional-escape/hex-escape format** — rejected: a materially larger
  feature (parsing/validating PostgreSQL's binary string escape syntax)
  than what this doc's Goals call for, and out of step with how every
  other free-input PostgreSQL type is treated today. Noted as an accepted
  known gap in Non-Goals instead.
- **Modeling PostgreSQL's Large Object facility as an additional type** —
  rejected: it isn't a plain column type (requires an `oid` column plus a
  separate object-management API), so it doesn't fit this app's type-list
  model at all; would need its own design doc if ever requested.

## Open Questions

None.
