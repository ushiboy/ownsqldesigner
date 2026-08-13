# Dialect Selector UI

- **Status**: Implemented
- **Created**: 2026-08-13
- **Updated**: 2026-08-13

## Context

[0026](0026-sql-dialect-strategy.md) built the `DialectStrategy` abstraction
specifically to prepare for a second dialect, and explicitly deferred a
picker: "an already-decided-for-the-user dropdown adds UI surface with no
present value; add it when a second dialect ships." [0034](0034-postgresql-dialect-strategy.md)
then shipped a full PostgreSQL `DialectStrategy` — the second dialect — but
kept scope to the domain layer only, again deferring the picker as a named
follow-up: "no way to create a schema with any dialect but SQLite."

This doc is that follow-up. It also folds in two PostgreSQL-correctness
gaps that 0034's Open Questions flagged as only becoming real (not
theoretical) once PostgreSQL is reachable from the UI:

- `ColumnDialog`'s free-text `size` field accepts a value for any column
  type, producing invalid DDL like `BOOLEAN(5)` under PostgreSQL.
- Checking auto-increment silently dropped any entered default value with
  no warning — harmless under SQLite (which tolerates both together) but
  wrong under PostgreSQL, whose identity columns reject an explicit
  `DEFAULT`.

Per this project's design-docs rule for refinements found within the same
round of work, both are folded into this doc rather than filed separately.

## Goals / Non-Goals

**Goals**

- Let a user choose the dialect (SQLite / PostgreSQL) when creating a new
  schema.
- Thread that choice through to the domain's `createSchema`.
- Disable/clear `ColumnDialog`'s `size` field for column types that don't
  accept a size modifier in the current dialect.
- Disable/clear `ColumnDialog`'s `defaultValue` field when auto-increment
  is checked, for dialects where the two are incompatible.

**Non-Goals**

- MySQL support.
- Widening `BIGINT` auto-increment eligibility (0034's other open
  question) — unrelated to the picker itself. (Done as a small follow-up
  after this doc shipped; see Open Questions.)
- A persisted "preferred default dialect" setting. Each new-schema dialog
  defaults to `DEFAULT_SQL_DIALECT` ("sqlite"), matching prior behavior;
  the choice is not written to `localStorage` the way the FK naming
  pattern setting is ([0025](0025-fk-naming-pattern-setting.md)).
- Editing a schema's dialect after creation. No function mutates
  `Schema.dialect` once `createSchema` sets it; this doc doesn't add one.
- Domain-layer (non-UI) enforcement of the size/default-value rules — e.g.
  during FK type propagation ([0013](0013-foreign-key-type-propagation.md))
  or schema-file import. Only the interactive `ColumnDialog` path is
  covered here; see Open Questions.

## Design

### Dialect field on `SchemaNameDialog`, create-only

`SchemaNameDialog` is reused for both schema creation (REQ-035) and rename
(REQ-037) — `DialogHost` renders two instances gated by `activeDialog`.
Since dialect only makes sense at creation, the component gained a
`showDialect?: boolean` prop; `SchemaNameForm` renders a `<select>`
(iterating `SQL_DIALECTS`, mirroring `ColumnDialog`'s existing type
`<select>`) only when it's true, and holds the choice in its own
`useState<SqlDialect>(DEFAULT_SQL_DIALECT)` — the same lifecycle as the
existing `name` state ("mounted only while the dialog is open, so state
resets each time"). `onSubmit`'s signature widened to
`(name: string, dialect?: SqlDialect) => void`; the rename instance simply
ignores the second argument. Only `DialogHost`'s create instance passes
`showDialect`.

### Threading the choice to `createSchema`

`useUndoableSchema`'s `createSchema` action widened from `(name: string) =>
void` to `(name: string, dialect?: SqlDialect) => void`, forwarding
straight to the domain `createSchema(name, { dialect })` — `dialect` being
optional on both sides means passing `undefined` (the rename path) falls
back to the domain function's own `DEFAULT_SQL_DIALECT` default, unchanged
from before this doc. `SchemaActions`/`UndoableSchemaActions` (the two
independent type declarations `useSchemaWorkspace.ts` and
`useUndoableSchema.ts` keep, one per hook) both widened the same way; no
other link in the chain needed a signature change.

### `ColumnDialog`: type-conditional size and default/auto-increment

`DialectStrategy`/`DialectStrategyConfig` gained two dialect-supplied,
data-shaped fields, alongside the existing `columnTypes: readonly
string[]`:

- `sizableColumnTypes: readonly string[]` — SQLite sets this to all of
  `SQLITE_COLUMN_TYPES` (preserving the previously unrestricted behavior
  exactly); PostgreSQL sets it to `["VARCHAR", "CHAR", "NUMERIC"]`. Real
  PostgreSQL also accepts a precision modifier on `TIME`/`TIMESTAMP`
  (`TIMESTAMP(p)`), but that's a fractional-seconds precision, not the same
  "length" concept `size` represents for `VARCHAR`/`CHAR`/`NUMERIC` — it's
  deliberately left out of `sizableColumnTypes` rather than overloading one
  free-text field for two different meanings, so `TIME`/`TIMESTAMP` keep
  `size` disabled like every other non-modifier type.
- `allowsDefaultWithAutoIncrement: boolean` — `true` for SQLite (matches
  0034's documented tolerance), `false` for PostgreSQL (identity columns
  reject an explicit `DEFAULT`).

`ColumnForm` derives `sizeAllowed` and `defaultValueAllowed` from these
(the latter also depends on the already-computed effective auto-increment
state) to disable each input and show a hint, exactly mirroring the
existing auto-increment-checkbox pattern. On submit, both fields are
clamped to `""` when disallowed, the same way `autoIncrement` was already
clamped to the eligible value — so switching a column's type away from a
sizable one, or checking auto-increment, silently drops a now-invalid
leftover value rather than letting it reach the DDL generator.

## Alternatives Considered

- **Lifting the dialect choice into `DialogHost` as controlled state**
  (originally planned) — rejected in favor of local `useState` inside
  `SchemaNameForm`, matching how `name` is already handled: the choice is
  pure form state needed only at submit time, so lifting it up would add a
  prop round-trip with no benefit, per
  [component-design.md](../rules/component-design.md)'s guidance that
  local UI state doesn't on its own justify moving state up.
- **Exporting `CreateSchemaOptions` from `table.ts`** (originally
  planned) — turned out unnecessary: passing `{ dialect }` as an object
  literal at the call site type-checks structurally against the existing
  (still-private) options type without importing it, so the type stays
  private, keeping `table.ts`'s public surface unchanged.
- **A settings-page dialect preference, persisted like the FK naming
  pattern** — rejected: dialect is chosen once per schema at creation
  time, not an ambient app preference the way FK naming pattern is: it has
  no meaning outside the moment of creating a new schema, so there's
  nothing to usefully persist across schemas.
- **Enforcing the size/default-value rules in the domain layer** (e.g. a
  `normalizeColumnForDialect` step run on every mutation, mirroring
  `normalizeAutoIncrement`) — deferred rather than rejected outright; kept
  to the interactive `ColumnDialog` path only for this change, matching
  0034's own framing of these two gaps as UI-level fixes. See Open
  Questions.

## Open Questions

- Should the size/default-value rules also be enforced at the domain
  layer (schema-file import, FK type propagation), the way
  `normalizeAutoIncrement` already is? Today a hand-edited or
  programmatically-constructed schema could still carry an invalid
  `size`/`defaultValue` combination that only `ColumnDialog`'s interactive
  path prevents.
- ~~0034's remaining open question — widening `isPostgresqlAutoIncrementEligible`
  to also allow `BIGINT` — is still unaddressed; now that PostgreSQL is
  user-selectable, it's worth revisiting.~~ Resolved 2026-08-13:
  `isPostgresqlAutoIncrementEligible` now allows
  `SMALLINT || INTEGER || BIGINT` (see
  [0034](0034-postgresql-dialect-strategy.md)). `DialectStrategy` gained
  `autoIncrementEligibleColumnTypes`, and `ColumnDialog`'s auto-increment
  hint now names the eligible type(s) per dialect instead of a hardcoded
  "INTEGER", so the hint stays accurate for both SQLite (`INTEGER`) and
  PostgreSQL (`SMALLINT / INTEGER / BIGINT`).
- Checking auto-increment currently leaves a stale `defaultValue` visible
  (grayed out) in the input until Save actually clears it — the hint text
  is easy to miss, so a user could lose a typed default without noticing.
  Should this clear immediately on check, or show a confirmation instead
  of a silent Save-time drop? Deferred because it mirrors the pre-existing
  `autoIncrement`-eligibility clamp pattern, not a new regression from
  this doc's work.
