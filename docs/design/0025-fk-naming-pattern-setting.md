# FK Naming Pattern Setting

- **Status**: Implemented
- **Created**: 2026-08-02
- **Updated**: 2026-08-02

## Context

[0012](0012-foreign-key-child-column-generation.md) implemented REQ-016
(auto-generating a child column when dragging a foreign key from a parent's
key handle) with one hardcoded naming pattern —
`` `${referencedTable.name}_${referencedColumn.name}` `` — and explicitly
deferred configurability to REQ-032 ("Persist settings: dialect, snap, FK
naming pattern, display toggles"), noting that no settings-persistence
module existed yet. Since then, `useSnapToGrid`, `useColumnDetailsVisibility`,
and `useThemePreference` have each independently grown their own
`localStorage`-backed hook — so the persistence half of REQ-032 already has
precedent; only the FK naming pattern itself was still unbuilt.

This doc implements that piece: making the REQ-016 naming pattern selectable
and persisted, as the first concrete slice of REQ-032.

## Goals / Non-Goals

**Goals**

- Let the user choose between two child-column naming patterns for REQ-016:
  - `tableColumn` (the existing default): `${table}_${column}`, e.g.
    `users_id`.
  - `tableId`: `${table}_id`, ignoring the referenced column's own name —
    useful when a project's convention is always `<table>_id` regardless of
    which column is actually referenced.
- Persist the choice in `localStorage`, the same way every other toggle in
  this codebase already does.
- Give this and future REQ-032 settings a home that scales as more settings
  are added, organized by category.

**Non-Goals**

- Migrating the existing theme / snap-to-grid / column-details-visibility /
  locale toggles out of the toolbar — they stay exactly where they are.
  Only the new FK naming pattern setting lives on the new page. Revisiting
  this is left to whichever later change actually needs it.
- A dialect setting — SQLite is still the only supported dialect (a stated
  Non-Goal of the app as a whole), so there is nothing to persist yet.
- More than two naming pattern templates, or a free-form custom template —
  the two chosen cover the common conventions; more can be added later
  without changing the setting's shape (`FkNamingPattern` is a plain string
  union, extending it is additive).

## Design

### A `/settings` route instead of a dialog

[0001](0001-main-screen.md) originally reserved a toolbar "settings button →
settings dialog" as REQ-032's entry point. This doc deviates from that
deliberately: settings now live at a dedicated `/settings` route
(`src/pages/Settings/`), with a "back to editor" link to return to `/`,
rather than a modal.

The reasoning: a dialog's content area does not scale well once REQ-032
covers multiple unrelated categories (foreign keys today; potentially
dialect, or other Phase 3 settings later) — a full page can group settings
under category headings (this doc adds one, "Foreign Keys") without fighting
dialog sizing/scrolling. `react-router` was already a dependency and already
handles the app's one existing non-editor route (`NotFound`), so adding a
second route needed no new infrastructure. The existing toolbar toggles
(theme, snap, column details, locale) were deliberately left where they are
rather than folded into this page — moving working, already-discoverable
controls wasn't necessary to unblock REQ-016, and doing so is left to a
later change if/when it's actually needed.

`Settings` follows the same Container (`Settings.tsx`) + Presentation
(`SettingsView.tsx`) split as `MainScreen`/`MainScreenView`
([component-design.md](../rules/component-design.md)), and wraps its own
`LocaleProvider` the same way `NotFound.tsx` already does — the two pages
are mutually exclusive routes (React Router mounts one at a time), so two
independent `LocaleProvider` instances reading/writing the same
`localStorage` key behave as one consistent preference to the user, per the
precedent [0019](0019-i18n-locale-switching.md) established.

### Persistence hook placement

`useFkNamingPattern` lives in `src/components/hooks/` (shared, cross-page),
not `src/pages/MainScreen/hooks/` — unlike `useSnapToGrid` and friends, this
setting is read by `MainScreen` (to pass into FK creation) and read/written
by `Settings`, so it needs to be usable from both per
[component-design.md](../rules/component-design.md)'s rule that logic used
outside a single page's tree belongs in the shared hooks directory. It
mirrors the existing hooks' shape: `localStorage` key
`ownsqldesigner:fkNamingPattern`, falling back to the domain layer's
`DEFAULT_FK_NAMING_PATTERN` ("tableColumn") on first run or an invalid
stored value, with an `initialFkNamingPattern` seed for stories/tests.

### Threading the pattern into FK creation

`MainScreen` only reads the setting (never writes it) and passes it down to
`MainScreenView`, which wraps the `addForeignKeyWithNewColumn` action from
`SchemaWorkspaceContext` in a closure that appends the current
`fkNamingPattern` as a 4th argument before calling it. `Canvas`'s own props
are unchanged — it still calls a 3-argument callback, unaware that naming
pattern exists. The domain function `addForeignKeyWithNewColumn`
(`src/domain/schema/foreignKey.ts`) gained a `namingPattern` option
(defaulting to `DEFAULT_FK_NAMING_PATTERN`) and a small pure helper,
`buildForeignKeyChildColumnName`, that switches on the pattern; the existing
collision-suffixing (`uniqueColumnName`) is unchanged and runs after the
pattern-specific name is built.

## Alternatives Considered

- **A settings dialog, per 0001's original plan** — rejected for this
  round: works for a single boolean-ish setting, but doesn't scale to
  multiple categories without either a tabbed dialog (more complexity than
  the payoff justifies right now) or an ever-taller single dialog. A route
  was simpler to build today and leaves room to grow.
- **Migrating every existing toggle into the new settings page now** —
  rejected: those toggles work today and are already easy to find in the
  toolbar; moving them isn't required to deliver the FK naming pattern
  setting, and doing it speculatively would touch far more files than this
  change needs to.
- **A `Set`/enum with more than two patterns from the start (e.g. singular
  table name, custom template string)** — rejected: no current requirement
  calls for more than the two conventions already in use elsewhere in this
  codebase's own fixtures and docs; `FkNamingPattern` is a plain string
  union, so adding a third option later is additive, not a redesign.

## Open Questions

- Whether a later change should migrate the toolbar's other toggles onto the
  settings page, and if so, whether the toolbar should keep shortcut buttons
  for them too (as it still does for locale in this doc's scope) or drop
  them once a settings-page equivalent exists.
- Whether a dialect setting, once more than one dialect is supported, fits
  better as its own category on this page or needs a different UI (e.g.
  affects a lot more downstream behavior than a naming pattern does).
