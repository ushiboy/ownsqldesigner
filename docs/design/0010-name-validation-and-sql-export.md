# Name Validation and SQL Export

- **Status**: Implemented
- **Created**: 2026-07-25
- **Updated**: 2026-07-28

## Context

[Requirements](../requirements.md)'s Phase 1 list is otherwise complete — table/column
CRUD, keys, and foreign-key relations all shipped in prior docs
([0004](0004-table-creation-and-placement.md)–[0009](0009-foreign-key-relations.md)).
Four requirements remained open: REQ-018 (table/column name uniqueness), REQ-019
(names must be valid SQL identifiers — the exact rule was left unsettled,
deferred to "a design doc"), REQ-023 (the UI must explain a rejected edit) for
this feature's own rules, and REQ-026 (Export SQL/DDL). The toolbar already had
an **"Export SQL" button with no `onClick` handler** — a pure UI stub from
[0001](0001-main-screen.md), which also already reserved this dialog's shape:
_"SQL Export — DDL preview with copy (REQ-026)."_

These four are bundled deliberately, not just adjacent scope: exporting DDL
when table/column names can collide or contain characters that break SQL
syntax would silently produce invalid output, so REQ-018/019/023 are a
correctness prerequisite for REQ-026.

## Goals / Non-Goals

**Goals**

- Table names unique within the schema, column names unique within their
  table, case-insensitively (REQ-018).
- A concrete, enforced rule for what makes a name a valid SQL identifier
  (REQ-019).
- Inline UI feedback explaining a rejected name (REQ-023, scoped to this
  feature's own rules).
- Generate SQLite DDL (`CREATE TABLE` with keys and foreign-key constraints)
  for the current schema and let the user copy or download it (REQ-026).
- Surface a passive, non-blocking warning inside the export dialog for any
  table with no primary key (REQ-034).

**Non-Goals**

- Reserved-keyword rejection (e.g. a table named `order`) — see Open
  Questions. (Closed later by [0029](0029-sql-reserved-keyword-rejection.md).)
- REQ-027 (schema file download/load) — a different requirement (downloading
  and loading the schema _JSON_, not the exported DDL) that 0001 already
  placed as a separate, later toolbar control. Only REQ-026's own DDL output
  is downloadable here.
- Quoted/escaped SQL identifiers.
- `ON DELETE` / `ON UPDATE` foreign-key actions — already a non-goal in 0009.

## Design

### REQ-019: identifier rule

Names must match `/^[A-Za-z_][A-Za-z0-9_]*$/`. This keeps `generateSqliteDdl`
(and every future dialect's generator) free of quoting/escaping logic
entirely — a valid name is guaranteed emittable verbatim. Different SQL
dialects use different quote characters (SQLite/standard `"`, MySQL `` ` ``,
SQL Server `[]`), and the project's constraint that adding a dialect must not
require rewriting core features makes this the cheaper long-term choice over
allowing arbitrary names and quoting them per-dialect at export time.

### REQ-018/019/023: validation placement and UI feedback

Following [0007](0007-table-key-management.md)'s and 0009's established
precedent for "simple validity" rules — ones the UI can prevent outright
rather than reject after the fact — this doc uses **UI-side prevention
(disable the control, show an inline hint) plus a cheap domain-level no-op
guard as defense-in-depth**, not a `NotificationContext`-based rejection. 0007
states this directly: _"no such pattern exists anywhere yet; UI-side
disabling... is this codebase's established mechanism for preventing invalid
submissions."_ Name validity is the same category, so REQ-023 is satisfied
here via inline hints rather than the notification bar.

`schema.ts` gains four exported predicates, reused identically by both the
domain guards and the UI:

```ts
export function isValidIdentifierName(name: string): boolean;
export function isNameTaken(name: string, existingNames: string[]): boolean; // case-insensitive
export function isTableNameAvailable(
  schema: Schema,
  name: string,
  excludeTableId?: string,
): boolean;
export function isColumnNameAvailable(
  table: Table,
  name: string,
  excludeColumnId?: string,
): boolean;
```

`createTable`, `renameTable`, `addColumn`, and `updateColumn` each gain a
no-op guard using these predicates, mirroring `canAddKey`'s existing
placement and style.

Three distinct UI surfaces needed this validation, not two as originally
assumed while planning — table renaming turned out to be a **live inline
text field in `SidePanel`'s `TableProperties`** (committing on every
keystroke via `onUpdateTableName`), not a second use of `TableNameDialog`
(which is create-only):

- `TableNameDialog` (table creation): a new `existingNames` prop; submit is
  disabled and a hint shown for an invalid shape or a taken name.
- `ColumnDialog` (add/edit column): the same `existingNames` prop and
  hint/disable treatment on the Name field.
- `SidePanel`'s `TableProperties` (inline table rename): a new
  `existingTableNames` prop; the `onChange` handler only calls
  `onUpdateTableName` when the trimmed value is valid and unique, and an
  inline hint appears otherwise. Blur-revert (already existing, for an
  emptied field) was extended to also revert on an invalid or duplicate value,
  so an abandoned edit doesn't strand the field on an uncommitted name.

All three call sites get their sibling-name lists from `MainScreenView`,
computed once via `useMemo` (avoiding a new array on every render, which
`react-perf/jsx-no-new-array-as-prop` flags).

### REQ-026: `generateSqliteDdl`

A new pure function, `src/domain/sqlite/generateDdl.ts`:

```ts
export function generateSqliteDdl(tables: Table[]): string;
```

It takes `Table[]` directly — exactly what `MainScreenView` already holds —
so no new `Schema`/`currentSchema` plumbing was needed. Namespaced under
`src/domain/sqlite/` (a new subfolder) rather than added flat into
`schema.ts` next to `SQLITE_COLUMN_TYPES`: this is new, sizeable,
dialect-specific code, and namespacing it now avoids a reshuffle when a
second dialect's generator is eventually added. (`SQLITE_COLUMN_TYPES` itself
stays where it is — moving pre-existing code is out of scope for this
change.)

Behavior:

- One `CREATE TABLE <name> (...)` per table (schema order), then all
  `CREATE INDEX` statements for `INDEX`-type keys afterward — SQLite does not
  support inline secondary indexes inside `CREATE TABLE`. No topological sort
  is needed for foreign keys: SQLite does not require a referenced table to
  already exist earlier in the script.
- Column line: `name TYPE[(size)] [NOT NULL] [DEFAULT value]`.
- `DEFAULT`: emitted raw when the value matches `/^-?\d+(\.\d+)?$/` (e.g.
  `DEFAULT 0`); otherwise wrapped as a string literal with embedded `'`
  doubled (e.g. `DEFAULT 'active'`, `O'Brien` → `DEFAULT 'O''Brien'`).
- PRIMARY KEY: inline `PRIMARY KEY AUTOINCREMENT` on the column when its
  `autoIncrement` flag is set — REQ-033's existing `withNormalizedAutoIncrement`
  invariant already guarantees this means "the table's sole INTEGER PK
  column." Otherwise, a table-level `PRIMARY KEY (col1, col2, ...)`
  constraint, covering both single- and multi-column non-autoincrement PKs
  uniformly.
- One table-level `UNIQUE (...)` per `UNIQUE` key; one `FOREIGN KEY (col)
REFERENCES table(col)` per foreign key. Composite-key column order follows
  `key.columnIds` exactly as stored (no re-sorting), matching `describeKey`'s
  existing display behavior — this resolves 0007's Open Question about
  composite column ordering for SQL export.
- `CREATE INDEX` naming: `idx_<table>_<col1>_<col2>...`, deduplicated via a
  `Set<string>` shared across the whole export (suffix `_2`, `_3`, ... on a
  collision — reachable only when two `INDEX` keys share the same column set,
  which nothing currently prevents).
- An empty schema (or a table with no columns) produces `""` / an empty
  `CREATE TABLE` body respectively; neither is prevented elsewhere in the app
  today.

### `ExportSqlDialog`

A new dialog (`src/pages/MainScreen/components/ExportSqlDialog/`) wraps the
existing `Dialog` primitive, showing the generated DDL in a read-only
`<textarea>`, a "Copy to clipboard" button (`navigator.clipboard.writeText`,
with a "Copied" label swap for confirmation), and a "Download .sql" button.
When there are no tables, it shows "No tables to export" instead, with both
buttons disabled.

Download uses the `file-saver` package (`saveAs(new Blob([ddl], { type:
"application/sql" }), fileName)`) rather than a hand-rolled
`URL.createObjectURL` + temporary `<a>` — a well-tested, widely-used library
for exactly this one job, added as a new dependency. The filename is derived
from the current schema name (`<schemaName>.sql`), with filesystem-unsafe
characters (`\ / : * ? " < > |`) replaced by `_`.

`Dialog` gained a `size` variant (`"default"` = the existing `w-96`,
`"large"` = `w-[640px] max-w-[90vw]`) so this dialog can request more room for
SQL text without affecting every other dialog's width; defaults to
`"default"`, a backward-compatible addition. `ColumnDialog` also adopts
`size="large"`, splitting its now-numerous fields into two columns (name/type/
size/default/nullable on the left; PRIMARY KEY/UNIQUE/INDEX/auto-increment
checkboxes and their hints on the right) so the dialog no longer grows
excessively tall as fields accumulate.

`ActiveDialogContext`'s `DialogKind` union gained `"exportSql"`; `Toolbar`'s
stub button now calls `openDialog("exportSql")`. `MainScreenView` computes
`ddl` via `useMemo(() => generateSqliteDdl(tables), [tables])` and renders
`ExportSqlDialog` alongside the other dialogs, passing `schemaName` through
for the download filename.

### REQ-034: primary-key warning

`schema.ts` gains one predicate, placed next to `hasConflictingPrimaryKey`:

```ts
export function hasPrimaryKey(table: Table): boolean;
```

True for a `PRIMARY_KEY`-type key or an `autoIncrement` column — the same two
conditions `generateDdl.ts`'s `generatePrimaryKeyConstraint` already checks
internally to decide between an inline `PRIMARY KEY AUTOINCREMENT` and a
table-level constraint, reused here instead of inventing a second notion of
"has a PK".

`DialogHost` computes `tablesWithoutPrimaryKey` (table names) the same way
it already scopes `ddl` — only while `activeDialog === "exportSql"` — via
`tables.filter((table) => !hasPrimaryKey(table)).map((table) => table.name)`,
and passes it to `ExportSqlDialog` as a new prop.

The dialog renders it as a static block above the DDL textarea, listing the
affected table names, using the `--color-danger` / `--color-danger-bg`
tokens already defined in `index.css` but unused elsewhere in the app. This
follows neither of 0007/0009's two established patterns (UI-side prevention,
or `NotificationContext` rejection) because REQ-034 is explicitly advisory:
Copy/Download stay enabled regardless of warnings, so there's nothing to
prevent or reject — a third, simpler category of "show it, don't act on it."

## Alternatives Considered

- **Allowing arbitrary names and quoting/escaping identifiers in generated
  SQL** — rejected: pushes dialect-specific quoting logic into every future
  dialect's generator, for a feature (identifiers needing quoting) nothing
  currently requires.
- **No download button for the DDL, deferring entirely to REQ-027** — an
  earlier draft of this doc rejected a download button as scope creep against
  REQ-027 (a separate requirement about downloading/loading the schema JSON).
  Revised after review: REQ-027's _load_ half is still out of scope, but
  downloading the DDL itself is a natural companion to copy-to-clipboard and
  does not require any of REQ-027's schema-JSON-specific work, so it's
  included here.
- **Hand-rolled `URL.createObjectURL` + temporary `<a>` for the download**
  — rejected in favor of the `file-saver` package: a one-line, well-tested
  call beats maintaining the browser-compatibility edge cases of a manual
  implementation for a single button.
- **Flat placement of `generateSqliteDdl` in `schema.ts`** — rejected for this
  _new_ code (see Design), even though `SQLITE_COLUMN_TYPES` itself wasn't
  moved.
- **`NotificationContext`-based rejection for REQ-018/019** — rejected,
  continuing 0007's and 0009's precedent against this pattern for
  simple-validity rules.
- **Reserved-keyword denylist** — rejected as out of scope; see Open
  Questions.

## Open Questions

- ~~A name that is a SQL reserved keyword (e.g. `order`) currently passes
  `isValidIdentifierName` but would still need quoting in real SQL — not
  solved here.~~ Resolved in
  [0029](0029-sql-reserved-keyword-rejection.md): rather than quoting,
  reserved-keyword names are rejected as invalid, the same as an empty or
  duplicate name.
- A `DEFAULT` value meant as an expression or keyword (e.g.
  `CURRENT_TIMESTAMP`) is quoted as a string literal by `formatDefaultValue`,
  since `defaultValue` has no literal-vs-expression flag — matches 0006's
  existing "free-form, dialect-unenforced" treatment of the field, but may
  need revisiting once a real use case appears.
- Two `INDEX` keys sharing the same column set produce a suffixed index name
  (`_2`, `_3`, ...) rather than being prevented at the UI level.
