# SQL Dialect Strategy

- **Status**: Implemented
- **Created**: 2026-08-03
- **Updated**: 2026-08-05

## Context

The app supports only SQLite today, but the [Constraints](../requirements.md)
section already states: "Adding a new SQL dialect (datatypes and SQL
generation) must be possible without rewriting core features." SQLite
knowledge was scattered across four places in `src/domain/`, not confined to
the one already-namespaced `src/domain/sqlite/` folder:

1. `SQLITE_COLUMN_TYPES` — the column type enum, baked into `columnSchema`'s
   zod validator (`src/domain/schema/types.ts`) and imported directly by
   `ColumnDialog` for its type `<select>`.
2. `generateSqliteDdl` — DDL generation, called directly by `DialogHost`.
3. The "AUTOINCREMENT only on a sole INTEGER PRIMARY KEY" rule (REQ-033),
   private to `src/domain/schema/shared.ts`, invoked from every column/key
   mutation.
4. The case-insensitive identifier-comparison rule, duplicated as private
   logic in `validation.ts` and `integrity.ts`, both commented "matching
   SQLite's own identifier comparison."

This is stage 1 of adding MySQL/PostgreSQL support: it extracts all four
into a Strategy pattern (`DialectStrategy`) and gives `Schema` a `dialect`
field, so each schema resolves its own dialect's behavior. SQLite remains
the only concrete strategy — no MySQL/PostgreSQL strategy is implemented
yet, and no dialect-selector UI is added, since a selector with exactly one
option provides no value today. `docs/requirements.md`'s Non-Goals
("Dialects other than SQLite") is therefore unchanged.

A `crit` review of the initial implementation (same round of work) raised
two points that changed the design from its first draft: (1) several free
functions were taking a `strategy`/`dialect` argument purely to forward it
to one `DialectStrategy` call — asked whether that belonged on the
interface instead; (2) `describeNameValidity`'s live UI hint had been left
resolving a hardcoded default dialect rather than the schema's actual one.

A follow-up self-review (same round) generalized point (1) further: every
place that took a raw `dialect: SqlDialect` and called `getDialectStrategy`
internally was converted to take the already-resolved `strategy:
DialectStrategy` directly instead, so a schema's strategy is resolved once
at each natural entry point (`MainScreenView` for the UI tree, the top of
each domain mutator) and threaded down rather than re-resolved repeatedly
(`getDialectStrategy` is a cheap `Record` lookup, so this is about
consistency and testability, not performance). That pass also re-exposed
`isAutoIncrementEligible` on the public `DialectStrategy` interface — see
"Threading the dialect through the UI" below. All of this is folded into
this doc's Design section rather than filed as a follow-up, per this
project's design-docs rule for refinements found within the same round of
work.

## Goals / Non-Goals

**Goals**

- A `DialectStrategy` interface covering the four extracted behaviors, with
  SQLite as the sole implementation.
- `Schema` gains a persisted `dialect` field, defaulting to `"sqlite"` for
  both new and previously-saved schemas.
- Every existing domain mutator and UI surface that depended on
  SQLite-specific behavior now resolves it through the schema's dialect
  instead of a hardcoded import.

**Non-Goals**

- Implementing a MySQL or PostgreSQL strategy.
- A dialect-selector UI (schema creation dialog, settings page, ...).

## Design

### `src/domain/dialect/`

Split into three files to avoid a circular import between the dialect
module (which needs `Column`/`Table` types) and `domain/schema/types.ts`
(which needs `SqlDialect` for the new `Schema.dialect` field):

- `sqlDialect.ts` — the leaf, zero imports: `SQL_DIALECTS`, `SqlDialect`,
  `DEFAULT_SQL_DIALECT`.
- `dialectStrategy.ts` — the `DialectStrategy` type consumers call
  (`columnTypes`, `isAutoIncrementEligible(column, pkColumnId)`,
  `normalizeAutoIncrement(table)`, `isNameTaken`, `hasDuplicateNames(names)`,
  `generateDdl`), importing `Column`/`Table` from `../schema/types`. Also
  exports `buildDialectStrategy(config)`, which derives the full
  `DialectStrategy` from a smaller `DialectStrategyConfig` (`columnTypes`,
  `isAutoIncrementEligible`, `isNameTaken`, `generateDdl`) — see "Folding
  free functions into the interface" below for why this split exists.
  `isAutoIncrementEligible` appears in both the config and the built
  interface: it's the atomic per-dialect predicate `normalizeAutoIncrement`
  is built from, but it's also useful as a standalone query (see
  `ColumnDialog` below), so it's exposed directly rather than only via the
  composite method.
- `dialectRegistry.ts` — `getDialectStrategy(dialect)`, a
  `Record<SqlDialect, DialectStrategy>` lookup keyed by the full
  `SqlDialect` union, so adding a dialect to `SQL_DIALECTS` without a
  matching strategy entry is a compile error.

`domain/schema/types.ts` imports only the leaf `sqlDialect.ts`, never
`dialectStrategy.ts` or `dialectRegistry.ts`, so the cycle never forms on
that side.

### `src/domain/sqlite/`

The existing `generateDdl.ts` is unchanged internally. New files hold the
other three extracted behaviors: `columnTypes.ts` (`SQLITE_COLUMN_TYPES`,
moved from `schema/types.ts`), `autoIncrement.ts`
(`isSqliteAutoIncrementEligible`, moved from `shared.ts`'s private
`isEligibleForAutoIncrement`), and `nameComparison.ts`
(`isSqliteNameTaken`, moved out of `validation.ts`). `sqliteDialectStrategy.ts`
passes all four to `buildDialectStrategy` to produce the concrete
`DialectStrategy` object that `dialectRegistry.ts` resolves for `"sqlite"`.

### Folding free functions into the interface

The first draft had `schema/shared.ts` export
`withNormalizedAutoIncrement(table, strategy: DialectStrategy)` and
`integrity.ts` keep a private `hasDuplicateNames(names, dialect)` — both
free functions whose entire body was "call one method on the resolved
strategy, plus a small generic algorithm around it" (iterate columns and
find the sole PK; scan a list for an earlier case-insensitive match).
Review feedback asked whether functions shaped like that belonged on
`DialectStrategy` itself instead of taking it as a parameter.

They do, but the generic algorithm around each one is genuinely
dialect-independent and would otherwise be duplicated by every future
dialect. `buildDialectStrategy` resolves this: a dialect module supplies
only the atomic per-dialect rule (`isAutoIncrementEligible`, `isNameTaken`),
and the factory wraps each in the shared generic algorithm to produce the
interface's `normalizeAutoIncrement(table)` and `hasDuplicateNames(names)`
methods. Callers that already have a resolved `strategy` (`column.ts`,
`key.ts`, `integrity.ts`) now call `strategy.normalizeAutoIncrement(table)`
/ `strategy.hasDuplicateNames(names)` directly — no more separate
`withNormalizedAutoIncrement(table, strategy)` free function, and no
private per-file `hasDuplicateNames` re-implementation.

### A circular-import trap, and its fix

`dialectRegistry.ts` imports the concrete `sqliteDialectStrategy`, which
(via `generateDdl.ts`) used to import `formatColumnType` from
`schema/column.ts` — but `column.ts` itself imports `getDialectStrategy`
from the dialect module. That closes a runtime cycle:
`sqliteDialectStrategy.ts` → `generateDdl.ts` → `schema` barrel → (`column.ts`
or `validation.ts`) → `dialect` barrel → `dialectRegistry.ts` →
`sqliteDialectStrategy.ts`. In practice this surfaced as `getDialectStrategy`
returning `undefined` at test time, because the registry's `Record` literal
captured `sqliteDialectStrategy` before that module had finished
initializing.

Fixed by making `generateDdl.ts` depend on `schema/types` **only** via
`import type` (erased at compile time, so it can never participate in a
runtime cycle) and inlining `formatColumnType`'s one-line ternary directly
in `generateDdl.ts` instead of importing the function value. Any future
dialect generator must follow the same rule: only type-only imports back
into `domain/schema`.

### `Schema.dialect`

`columnSchema.type` widens from `z.enum(SQLITE_COLUMN_TYPES)` to
`z.string().min(1)` — the allowed set is now dialect-owned, not a fixed
global enum. `schemaSchema` gains
`dialect: z.enum(SQL_DIALECTS).default(DEFAULT_SQL_DIALECT)`. The zod
`.default()` means schemas saved to `localStorage` before this change (which
lack the field) parse successfully as `"sqlite"`, with no
`STORAGE_VERSION` bump or migration code needed.

`createSchema`'s `CreateSchemaOptions` gained an optional `dialect`
(defaulting to `DEFAULT_SQL_DIALECT`). Since `test-fixtures.ts` and every
existing test route schema creation through `createSchema`, they keep
working unchanged.

Because `columnSchema.type` no longer enum-validates at parse time,
`integrity.ts`'s `isTableIntegrityValid` gained a check that each column's
`type` is one of `getDialectStrategy(schema.dialect).columnTypes` — keeping
`parseSchemaFile`/`importSchema` (REQ-027) rejecting an invalid column type
the same way it did before.

### Threading the dialect through domain mutators

`normalizeAutoIncrement`/`hasDuplicateNames` and the name-availability
guards operate on a bare `Table`, not `Schema`, so they take the resolved
strategy from callers that already hold `schema`. Functions that hold
`Schema` directly (`isTableNameAvailable`, `isSchemaIntegrityValid`,
`isTableIntegrityValid`) resolve `getDialectStrategy(schema.dialect)`
internally — nothing else needs to reach in. Functions that hold only
`Table`/`Table[]` (no `Schema`) take an already-resolved
`strategy: DialectStrategy` parameter instead of a raw `dialect:
SqlDialect`, so a single top-level resolution serves every call within one
mutation rather than each function re-resolving from the same string:

- `column.ts`: `addColumn`/`updateColumn` each resolve
  `getDialectStrategy(schema.dialect)` **once** at the top and pass the
  same `strategy` to `canAddColumn`/`canUpdateColumn`,
  `strategy.normalizeAutoIncrement(table)`, and `propagateColumnTypeChange`
  — `updateColumn` previously resolved it twice (once for its own
  `normalizeAutoIncrement` call, again inside `canUpdateColumn` via a
  `dialect` parameter). `uniqueColumnName(table, baseName, strategy)` no
  longer re-resolves the strategy on every suffix-collision iteration of
  its loop.
- `foreignKey.ts`: `addForeignKeyWithNewColumn` resolves `strategy` once
  and passes it to `uniqueColumnName`.
- `validation.ts`: `isColumnNameAvailable(table, name, strategy,
excludeColumnId?)` and `describeNameValidity(trimmedName, existingNames,
strategy)` both take `strategy: DialectStrategy` rather than `dialect`.
- `integrity.ts`: calls `getDialectStrategy(schema.dialect).hasDuplicateNames(names)`
  directly at both call sites, which already have `schema`.

### Threading the dialect through the UI

Every UI surface that resolves dialect-specific behavior now receives an
already-resolved `strategy: DialectStrategy` prop (not a raw `dialect:
SqlDialect` string), sourced from `MainScreenView`'s
`useMemo(() => getDialectStrategy(currentSchema?.dialect ??
DEFAULT_SQL_DIALECT), [currentSchema?.dialect])` (resolved once and reused
for both children below — `getDialectStrategy` returns the same object
reference for a given dialect, since each concrete strategy is a
module-level `const`, so this is referentially stable across renders like
any other memoized prop):

- `DialogHost` uses `strategy.generateDdl(tables)` directly (no more
  internal `getDialectStrategy` call) and forwards the `strategy` prop
  itself to `ColumnDialog` and `TableNameDialog`.
- `ColumnDialog` uses `strategy.columnTypes` directly (replacing a separate
  `columnTypes` prop from an earlier draft — one `strategy` prop already
  carries it) and passes `strategy` to `describeNameValidity`.
- `TableNameDialog` passes its `strategy` prop straight to
  `describeNameValidity`.
- `SidePanel` forwards `strategy` to `TableProperties`, which passes it to
  both of its `describeNameValidity` calls (the render-time hint and the
  inline `onChange` commit check).

This reverses the initial draft's choice to leave `describeNameValidity`
resolving a hardcoded `DEFAULT_SQL_DIALECT` — review feedback pointed out
that leaving the UI's live-validation hint on a different rule than the
domain layer's actual guard was a latent inconsistency, worth the
prop-threading even though it's behaviorally a no-op while SQLite is the
only dialect.

`ColumnDialog`'s auto-increment-checkbox enablement, previously a literal
`fields.type === "INTEGER"` check, now calls
`strategy.isAutoIncrementEligible(candidateColumn, pkColumnId)` — the same
predicate `normalizeAutoIncrement` is built from (see "Folding free
functions into the interface"). Since the form has no real column `id` yet
for an in-progress Add, and `isAutoIncrementEligible`'s contract compares
`column.id === pkColumnId`, the call constructs a hypothetical column with
a shared sentinel `PK_CANDIDATE_ID` for both `id` and `pkColumnId` (only
when `keyMembership.PRIMARY_KEY` is checked, `undefined` otherwise) — i.e.
"would a column with these fields qualify if it were the table's sole PK
column?" This was a gap in the initial draft: it hardcoded SQLite's own
rule in the UI, so a future dialect with a different eligibility rule
(e.g. not restricted to `INTEGER`) would show the wrong enablement state
even after adding its own `DialectStrategy`.

## Alternatives Considered

- **Leaving `describeNameValidity` resolving a hardcoded default dialect**
  — the initial draft's choice, reversed on review: rejected because it
  leaves the UI's live-validation hint and the domain layer's actual guard
  on two different (if currently identical) rules, a latent inconsistency
  not worth the prop-threading it saves.
- **Free functions taking `strategy`/`dialect` as a parameter for
  auto-increment normalization and duplicate-name scanning** (an earlier
  `withNormalizedAutoIncrement(table, strategy)` in `shared.ts`, a private
  per-file `hasDuplicateNames(names, dialect)` in `integrity.ts`) —
  rejected on review in favor of folding both into `DialectStrategy` itself
  via `buildDialectStrategy`, so callers with a resolved `strategy` call
  `strategy.normalizeAutoIncrement(table)` directly instead of importing a
  separate function.
- **Passing a raw `dialect: SqlDialect` and resolving `getDialectStrategy`
  inside every `Table`-level function and UI component that needed dialect
  behavior** — the initial draft's choice for `isColumnNameAvailable`,
  `uniqueColumnName`, `describeNameValidity`, and every UI prop; reversed
  on self-review in favor of resolving once at each natural entry point and
  threading the resolved `DialectStrategy` object down. Kept only where a
  function already holds the full `Schema` (`isTableNameAvailable`,
  `isSchemaIntegrityValid`, `isTableIntegrityValid`) — there, resolving
  internally adds no extra parameter and there's no risk of the redundant
  re-resolution this alternative caused elsewhere (`updateColumn` resolved
  twice per call; `uniqueColumnName`'s loop resolved on every iteration).
- **Leaving `ColumnDialog`'s auto-increment checkbox as a literal
  `fields.type === "INTEGER"` check** — rejected on the same self-review:
  it would silently show the wrong enablement state for a future dialect
  whose eligibility rule isn't "INTEGER only," since `isAutoIncrementEligible`
  had been removed from the public interface in the prior round. Re-exposing
  it (alongside the composite `normalizeAutoIncrement`) lets the UI ask the
  real per-dialect rule instead of re-implementing SQLite's own version of it.
- **A dialect-selector UI at schema creation, even with one option** —
  rejected: an already-decided-for-the-user dropdown adds UI surface with
  no present value; add it when a second dialect ships.
- **Bumping `STORAGE_VERSION` and writing an explicit migration for
  existing stored schemas** — rejected: zod's `.default()` on
  `schemaSchema.dialect` already fills in `"sqlite"` for schemas saved
  before this change, so no migration code is needed.
- **Keeping `formatColumnType` shared between `column.ts` and
  `generateDdl.ts`** — rejected: it was the sole runtime dependency
  creating the circular import described above; duplicating its one-line
  ternary was cheaper than restructuring module boundaries.

## Open Questions

- None of `Table`'s domain shape depends on dialect beyond `Column.type`'s
  now-dialect-owned value set. A future dialect with genuinely different
  per-column constraints (e.g. required `size` for some types) may need a
  richer `DialectStrategy` surface than `columnTypes: readonly string[]`.
