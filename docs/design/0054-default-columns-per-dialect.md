# Default Columns per Dialect

- **Status**: Implemented
- **Created**: 2026-08-29
- **Updated**: 2026-08-29

## Context

Nearly every table a user creates repeats the same few columns — an `id`
primary key, `created_at`, `updated_at` — added by hand each time. These
conventions are usually fixed per project and differ by dialect (SQLite's
`INTEGER PRIMARY KEY` auto-increment column shape isn't PostgreSQL's). REQ-040
lets the user define, once per dialect, the columns that should already be
present whenever a new table is created.

Like the FK naming pattern ([0025](0025-fk-naming-pattern-setting.md)), this
is a global app preference — not part of any one schema — configured on the
`/settings` page and persisted to `localStorage`.

An initial pass built a bespoke inline form (`DefaultColumnTemplateRow`) that
re-implemented `ColumnDialog`'s field set — name/type/size/precision/default
value/nullable/auto-increment plus key selection — directly in the Settings
page. A review caught that this duplicated an existing, already-tested
component instead of reusing it; the Design section below reflects the
corrected approach: the Settings page shows a summary list (styled like
`SidePanel`'s column list) and reuses `ColumnDialog` itself, in a modal, for
add/edit.

## Goals / Non-Goals

**Goals**

- Define zero or more default column templates per dialect (SQLite,
  PostgreSQL), persisted across sessions.
- Each template column may own any combination of single-column keys
  (PRIMARY_KEY / UNIQUE / INDEX) — the same per-column key membership a real
  `Column` can have — with a table-wide rule that only one row may be
  PRIMARY_KEY.
- Applying templates happens automatically on every "create table" for the
  current schema's dialect — no toggle in the create-table dialog.
- An empty (or unconfigured) template list behaves exactly like today: a
  table is created with no columns.
- The settings schema tolerates a dialect key it doesn't yet recognize, so
  adding a dialect to `SQL_DIALECTS` later needs no migration of previously
  saved settings.

**Non-Goals**

- Composite key templates — default columns cover the common single-column
  case (an `id` PK, a `UNIQUE` `email`, ...); a composite default key would
  add significant template/UI complexity for a rare need.
- Per-schema overrides — the template is one global setting per dialect, not
  customizable per schema.
- Retroactively applying templates to tables that already exist.

## Design

### Data model

`src/domain/schema/defaultColumnTemplate.ts` defines `DefaultColumnTemplate`
(Zod-validated): every `Column` field, plus a `keyMembership:
ColumnKeyMembership` (the same `{ PRIMARY_KEY, UNIQUE, INDEX }` boolean
triple `ColumnDialog`/`SidePanel` already use for a real column's key
membership). `DefaultColumnTemplate` minus `keyMembership` is structurally
exactly a `Column` — its `id` only identifies the template row itself (for
editing/reordering in the Settings list); applying a template later
generates a fresh id for the real column, the same way `addColumn` always
does. That structural match is what lets the Settings UI hand a template
straight to `ColumnDialog` as `initialColumn` (see Settings UI below).

The full settings value is `DefaultColumnTemplatesSettings =
Partial<Record<SqlDialect, DefaultColumnTemplate[]>>`, validated with
`z.record(z.string(), z.array(defaultColumnTemplateSchema))` rather than an
object with `sqlite`/`postgresql` as required keys. A dialect absent from the
record simply has no templates yet; `getDefaultColumnTemplatesForDialect`
reads it back with an empty-array fallback. This was a deliberate correction
during design review: an earlier draft modeled the settings object with
`SQL_DIALECTS`'s two members as required keys, which would have forced a
migration path the day a third dialect is added. The partial-record shape
needs none.

Business rules that aren't structural (e.g. "at most one row per dialect may
be PRIMARY_KEY") are enforced by the Settings UI, not the Zod schema — the
same split `columnSchema` already draws between shape and
dialect-conditional validity.

### Persistence

`src/components/hooks/useDefaultColumnTemplates.ts` follows
`useFkNamingPattern`'s shape exactly: `usePersistedState` with `localStorage`
key `ownsqldesigner:defaultColumnTemplates`, `serialize: JSON.stringify` and
a `parse` that runs the raw JSON through `defaultColumnTemplatesSettingsSchema
.safeParse`, falling back to `{}` on any parse/validation failure.

### Applying templates

`src/domain/schema/createTableWithDefaultColumns.ts` composes the existing
`createTable`, `addColumn`, and `addKey` domain functions into one `Schema`
update, so a table plus its default columns lands as a single undo/redo
step. Each template column is added with `normalize: !hasAnyKey` (`hasAnyKey`
= any of `keyMembership`'s three flags is true) — mirroring `ColumnDialog`'s
own addColumn-then-key-assignment submit: a column about to receive at least
one key must skip normalization until the key(s) exist (otherwise
`normalizeColumnForDialect` would clear its `autoIncrement` before there's a
PRIMARY KEY to justify it), while a keyless column has no follow-up step and
can normalize immediately. `addKey` is then called once per true membership
flag (mirroring `setColumnKeyMembership`'s own `KEY_TYPES.reduce`), so a
column can end up owning e.g. both a UNIQUE and an INDEX key. After all
templates are applied, the whole table is normalized once more as a safety
net — needed because a key that `addKey` rejects (e.g. a second PRIMARY_KEY
template) leaves that column's `normalize: false` state unresolved
otherwise.

`useUndoableSchema`'s `createTable` action gained an optional second
parameter, `defaultColumnTemplates: DefaultColumnTemplate[] = []`, threaded
through unchanged from the caller — the hook does not read `localStorage`
itself, keeping it testable the same way `namingPattern` already is for FK
creation.

### Wiring

`MainScreen` reads `useDefaultColumnTemplates()` and passes the whole
settings value down to `MainScreenView`, which narrows it to the current
schema's dialect via `getDefaultColumnTemplatesForDialect` and passes that
array into `DialogHost`. `DialogHost`'s `TableNameDialog` submit handler
calls `onCreateTable(name, defaultColumnsForDialect)`. `TableNameDialog`
itself is unchanged — from the user's perspective, table creation still asks
only for a name.

### Settings UI

`ColumnDialog` moved from `src/pages/MainScreen/components/ColumnDialog/` to
`src/components/parts/ColumnDialog/` — it's no longer used by only one page,
so it belongs in the shared component location (the same reasoning
`component-design.md` already applies to cross-page hooks, e.g. why
`useFkNamingPattern` lives in `src/components/hooks/` and not under
`pages/MainScreen/`). No behavior changed in the move, only its import path
(one caller, `DialogHost.tsx`, updated).

`src/pages/Settings/components/DefaultColumnTemplatesEditor/` is now the
only new Settings component. It renders:

- A dialect tab switcher, iterating `SQL_DIALECTS`/`SQL_DIALECT_LABELS`
  (not a hardcoded pair) the same way the data model avoids hardcoding them.
- The selected dialect's templates as a summary list — name + type per row,
  styled like `SidePanel`'s own column list — with move-up/down, edit, and
  delete icon buttons reusing `SidePanel`'s own aria-label strings
  (`editColumnAriaLabel`, `deleteColumnAriaLabel`,
  `moveColumnUp/DownAriaLabel`, `addColumn`) rather than inventing new
  Settings-scoped ones for the same concept.
- An "Add Column" button and each row's edit button both open the same
  `ColumnDialog` instance in a modal — `initialColumn={null}` for add,
  or the template (minus `keyMembership`) for edit — reusing its existing
  `title`/`submitLabel` strings from the `columnDialog`/`common` namespaces
  (`addTitle`/`editTitle`, `add`/`save`) exactly as `DialogHost` does for
  real columns.
- `getDefaultColumnTemplateKeyMembershipDisabled` (mirrors
  `getColumnKeyMembershipDisabled`, but scanning the template list instead
  of a real `Table`) feeds `ColumnDialog`'s `keyMembershipDisabled` prop, so
  a second row can't also check PRIMARY_KEY.

This is added to `SettingsView` as a new "Default Columns" section,
alongside the existing "Foreign Keys" section. Reusing `ColumnDialog`
directly means the Settings page needed no bespoke field-rendering code at
all — every input, disabled-state rule (size/precision/default-value
applicability, auto-increment eligibility), and validation message is the
same code path real column editing already exercises.

## Alternatives Considered

- **Per-schema template, stored on `Schema` itself** — rejected: the user
  wants one convention reused across every schema of a given dialect, not a
  per-project setting; a global preference is also simpler to implement and
  matches the FK naming pattern precedent.
- **A checkbox in the create-table dialog to opt in per creation** —
  rejected: adds a decision to a dialog whose whole point is "just a name",
  for a setting that's supposed to represent the user's standing
  convention. Always-on with an empty-by-default template keeps existing
  behavior unchanged until the user opts in via Settings.
- **`SQL_DIALECTS`-keyed required object for the settings shape** —
  reconsidered during design review (see Data model above) in favor of a
  partial record, so a future additional dialect needs no migration.
- **Composite default keys** — rejected: the common cases (`id` PK,
  `email` UNIQUE) are all single-column; supporting composite keys would
  require a materially more complex template shape and editor UI for a need
  that hasn't come up.
- **A bespoke inline card form per row, with a single `keyType: KeyType |
null` field** — this was the first implementation, replaced after review
  (see Context). It duplicated `ColumnDialog`'s entire field set instead of
  reusing it, and its single-`keyType` model was more restrictive than a
  real `Column`'s independent PRIMARY_KEY/UNIQUE/INDEX flags for no reason
  tied to the feature itself.
