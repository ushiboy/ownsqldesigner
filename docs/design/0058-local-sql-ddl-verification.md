# Local SQL DDL Verification

- **Status**: Accepted
- **Created**: 2026-09-02
- **Updated**: 2026-09-02

## Context

`generateSqliteDdl` and `generatePostgresqlDdl` ([0026](0026-sql-dialect-strategy.md),
[0034](0034-postgresql-dialect-strategy.md)) are covered by unit tests
(`generateDdl.test.ts` for each dialect), but those tests only assert on the
generated DDL **string**. Nothing in the repo confirms that string actually
applies against a real SQLite or PostgreSQL engine.

This doc adds a local-only, developer-run tool that builds a JSON `Schema`
covering every currently-exportable feature for each dialect, generates DDL
from it through the app's own `getDialectStrategy(dialect).generateDdl(tables)`
(the same call `DialogHost.tsx` makes when a user opens the Export SQL
dialog), and applies that DDL against real engines running in Docker,
reporting pass/fail with the engine's own error output on failure.

This is pure dev-tooling, not a shipped feature: `docs/requirements.md`
explicitly frames the app as needing no server, and this tool's purpose is to
verify DDL correctness for contributors, not to run inside the app. For now
it is **not** wired into CI or the pre-commit gate — a manual `pnpm
verify:sql`, the same posture [0027](0027-e2e-testing-with-playwright.md)
took for `pnpm test:e2e` before CI existed at all, and later revisited in
[0028](0028-ci-github-actions.md). Whether to add a CI job here later is left
as an Open Question rather than ruled out.

## Goals / Non-Goals

**Goals**

- Build one comprehensive `Schema` fixture per dialect (SQLite, PostgreSQL),
  covering every column type (including sized/precision variants), inline
  AUTOINCREMENT / `GENERATED ALWAYS AS IDENTITY`, NOT NULL, every DEFAULT
  literal/keyword shape the export layer supports, composite PRIMARY KEY,
  multi-column INDEX, composite UNIQUE, and FOREIGN KEY — built through the
  same domain factories the app itself uses (`createSchema`/`createTable`/
  `addColumn`/`addKey`/`addForeignKey`), so the fixture can only reach states
  the UI can actually produce.
- Generate DDL exclusively through `getDialectStrategy(dialect).generateDdl`
  — never reimplement SQL generation.
- Apply that DDL against a real SQLite engine and a real PostgreSQL engine,
  both running in Docker, and report success/failure per dialect with the
  engine's own error output surfaced on failure.
- A single manual entry point: `pnpm verify:sql`.
- Keep the fixture's type coverage tied to each dialect's own type-list
  constants (`SQLITE_COLUMN_TYPES`, `POSTGRESQL_COLUMN_TYPES`, ...) so it
  keeps up automatically if those lists grow.

**Non-Goals**

- CI wiring, for now (see Context and Open Questions).
- Folding into `pnpm test` or `docs/rules/pre-commit-checks.md`.
- CHECK constraints, ENUM types, DOMAIN types — confirmed unsupported by the
  export layer today (repo-wide grep, no hits). The fixture-building scripts
  iterate each dialect's type-list constants directly, so when export gains
  one of these, the same fixture files are where it gets added.
- Verifying anything beyond DDL _application_: no INSERT/round-trip data
  checks, no ALTER/DROP coverage.
- A multi-version engine matrix — one pinned `postgres` image tag, whatever
  SQLite version the chosen CLI image ships.

## Design

### Directory layout

```
sql-verify/
  Dockerfile                  Custom runner image: sqlite3 + postgresql-client (psql) CLIs
  docker-compose.yml          "postgres" (official image) + "runner" (built from the Dockerfile)
  tsconfig.json                Own TS project (Node types only, no Vitest/DOM globals)
  fixtures/
    sqliteFixture.ts          Builds the comprehensive SQLite-dialect Schema
    postgresqlFixture.ts      Builds the comprehensive PostgreSQL-dialect Schema
  generateSql.ts               Builds both fixtures, generates DDL, writes .output/*.sql
  runVerifySql.ts              Entry point: generate → start postgres → apply via runner → report → teardown
  .output/                     Generated .sql files (gitignored)
```

No file under `src/` is touched; `sql-verify/*.ts` only imports _from_
`src/domain/...`, never the reverse.

### Why both dialects run inside Docker

SQLite is embedded/file-based, so a host-side option (Node's built-in
`node:sqlite`, or a `better-sqlite3` devDependency) was considered — but that
makes the check depend on the host's Node capabilities or on compiling a
native module, which the tool is explicitly meant to avoid: it should work
the same way regardless of what's installed on a contributor's machine, with
Docker as the only prerequisite. So SQLite verification also runs inside a
container, via the real `sqlite3` CLI.

No official image ships both `sqlite3` and `psql`, so `sql-verify/Dockerfile`
builds a small custom `runner` image (`debian:bookworm-slim` +
`apt-get install sqlite3 postgresql-client`) used for both checks. This also
gives structured, real error text on failure — the CLI tools' own stderr,
not a hand-rolled reimplementation of engine error messages.

### `docker-compose.yml`

- `postgres`: `postgres:18-alpine` (current stable major as of this doc).
  `tmpfs`-mounted data directory (nothing persists between runs), a
  `pg_isready` healthcheck, host port `55432` (avoids colliding with a
  contributor's own local Postgres on 5432).
- `runner`: built from `sql-verify/Dockerfile`, `sql-verify/.output` mounted
  read-only at `/work`, `depends_on: postgres: condition: service_healthy`.

### DDL generation and fixture construction

`generateSql.ts` calls each fixture builder, then
`getDialectStrategy(dialect).generateDdl(schema.tables)`, and writes
`sqlite.sql` / `postgresql.sql` to `.output/`. This step only produces
strings — no engine involved — so it runs on the host via `tsx`, not inside
a container.

Fixtures are built by chaining the real domain factories
(`src/domain/schema/{table,column,key,foreignKey}.ts`), exactly like
`src/domain/schema/test-fixtures.ts`'s `buildTwoTableSchema()`. This matters
beyond style: `addColumn`/`addKey`/`updateColumn` all run
`normalizeColumnForDialect` on every call, which silently drops
size/precision/defaultValue/autoIncrement values the dialect wouldn't
actually allow (`src/domain/dialect/dialectStrategy.ts`). Building fixtures
this way, instead of constructing `Table` object literals directly, means the
fixture is guaranteed to be a state the UI can actually reach — the same
guarantee `generateDdl.test.ts` deliberately does _not_ have, since it
constructs `Table` literals directly to test the generator's own
defense-in-depth branches in isolation.

One consequence: an autoincrement/identity column can only be marked
`autoIncrement: true` _after_ its PRIMARY KEY key exists, since both
dialects' eligibility check (`isSqliteAutoIncrementEligible`,
`isPostgresqlAutoIncrementEligible`) requires the column to already be the
table's sole PRIMARY KEY column. Fixture construction order is therefore:
add the column → add the PRIMARY KEY key → `updateColumn` to flip
`autoIncrement: true`.

Each fixture has one "kitchen sink" table (`items`) iterating its dialect's
`*_COLUMN_TYPES`/`*_SIZABLE_COLUMN_TYPES`/`*_PRECISION_COLUMN_TYPES`
constants, plus explicit columns for NOT NULL, each DEFAULT shape (numeric
literal, quote-escaped string literal, and the keyword literals the dialect
actually renders unquoted — `CURRENT_TIMESTAMP`/`TRUE`/`FALSE`/`NULL`), a
multi-column INDEX, and a composite UNIQUE — plus a second table
(`item_variants`) with a composite PRIMARY KEY and a FOREIGN KEY back to
`items`. (An exact duplicate-column-set INDEX pair, to exercise the
DDL generator's own name-deduplication suffix, is deliberately **not**
included: `addKey`'s `hasDuplicateIndexColumnSet` guard
([0046](0046-prevent-duplicate-index-column-set.md)) blocks that state at
the domain layer, so it's no longer UI-reachable and stays covered only by
`generateDdl.test.ts`'s direct-literal test.)

An identity/autoincrement column carrying a `defaultValue` was considered for
the PostgreSQL fixture, to exercise `generateColumnDefinition`'s
identity-suppresses-DEFAULT branch end-to-end — but
`normalizeColumnForDialect` already strips `defaultValue` whenever
`autoIncrement` is true and the dialect's `allowsDefaultWithAutoIncrement` is
`false` (PostgreSQL's case), before `generateDdl` ever sees it. That
combination isn't reachable through the factories at all, so it's left out
rather than forced.

### `sql-verify/tsconfig.json`

Its own project (referenced from the root `tsconfig.json`), not folded into
`tsconfig.app.json` (would pull in Vitest globals) or `tsconfig.node.json`
(uses `module: "nodenext"`, which requires explicit file extensions on
relative imports — incompatible with the extensionless imports into
`src/domain/...` this tool relies on). Instead it mirrors
`tsconfig.app.json`'s bundler-style resolution
(`moduleResolution: "bundler"`, `allowImportingTsExtensions: true`) with
`types: ["node"]` and no DOM lib, so `tsc -b` resolves the same extensionless
imports `tsx` resolves at runtime, without pulling in any browser or test
globals.

### Orchestration — `runVerifySql.ts` / `pnpm verify:sql`

1. `generateVerificationSql()` — writes `.output/sqlite.sql` and
   `.output/postgresql.sql`.
2. `docker compose up -d --wait postgres` — output streamed live. A failure
   here (e.g. Docker not running) is reported distinctly from a DDL-apply
   failure, then the script exits.
3. `docker compose run --rm runner sh -c "sqlite3 -bail /tmp/verify.db < /work/sqlite.sql"`
   — `-bail` makes the CLI stop and exit non-zero on the first failing
   statement.
4. `docker compose run --rm runner sh -c "psql <connection-url> -v ON_ERROR_STOP=1 -f /work/postgresql.sql"`
   — `ON_ERROR_STOP=1` gives the same non-zero-on-error behavior for `psql`.
5. `docker compose down -v` in a `finally`, regardless of outcome.
6. Print `SQLite: PASS/FAIL` and `PostgreSQL: PASS/FAIL`, with captured
   stderr on failure; exit non-zero if either failed.

### New devDependency

Only `tsx` — it resolves `sql-verify/`'s extensionless imports into
`src/domain/...` the same way Vite does (Node's own type-stripping doesn't).
No DB client library is needed: applying DDL happens entirely through the
`runner` container's CLI tools, so nothing here becomes a runtime dependency
of the app itself, which continues to ship zero server/DB-client code.

## Alternatives Considered

- **`node:sqlite` (or `better-sqlite3`) for SQLite, skipping Docker for that
  dialect** — rejected: makes the check depend on the host's Node
  capabilities (or a native module build), inconsistent with verifying both
  dialects the same way and with the goal of needing only Docker.
- **`pg` (Node client library) for PostgreSQL instead of `psql`** —
  rejected together with the above once SQLite also moved to a CLI-in-Docker
  approach: keeping both dialects on the same CLI-based mechanism is simpler
  than mixing a Node DB client for one dialect with a container CLI for the
  other.
- **Reusing the official `postgres` image directly for SQLite too** (no
  custom image) — not possible: no official image ships a `sqlite3` CLI
  alongside `psql`, hence the small custom `runner` Dockerfile.
- **Node's native TypeScript stripping (`node script.ts`) instead of
  `tsx`** — rejected: confirmed by direct test to fail resolving this
  repo's extensionless imports into `src/domain/...` (`ERR_MODULE_NOT_FOUND`);
  `tsx`'s esbuild-based resolver matches Vite's own bundler resolution.
- **CI wiring now** — rejected for this round; see Open Questions.

## Open Questions

- Whether to add a CI job for this later, the way [0028](0028-ci-github-actions.md)
  later added one for `pnpm test:e2e` after [0027](0027-e2e-testing-with-playwright.md)
  shipped it manual-only.
- Whether `postgres:18-alpine` should be pinned more strictly (a specific
  point release) once this tool has been in use for a while.
