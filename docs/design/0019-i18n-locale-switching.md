# i18n / Locale Switching

- **Status**: Implemented
- **Created**: 2026-08-01
- **Updated**: 2026-08-01

## Context

REQ-030 asks for Japanese / English UI switching. Every user-facing string in the app is currently a hardcoded English literal — button labels, dialog titles, validation hints, notification messages, and tooltips — spread across the toolbar, every dialog, the side panel, the canvas table node, and the 404 page. There is no i18n library installed.

Unlike `useThemePreference` (REQ-029), where only the toolbar button and `document.documentElement` need the value, the translated string is needed by nearly every leaf presentational component in the tree — dialogs, the side panel, the canvas, and the 404 page (which isn't even under `MainScreen`). That is exactly the shape of state the codebase's own `useThemePreference` doc reserves for Context, not prop-drilling.

`use-intl` was chosen as the translation library (over a hand-rolled dictionary) specifically so that adding a third locale later is a matter of writing a new message file, not extending a bespoke interpolation mechanism.

## Goals / Non-Goals

**Goals**

- Translate every currently-hardcoded user-facing string (labels, titles, validation/error hints, notification messages, tooltips) into English and Japanese.
- A toolbar control to switch the active language, mirroring the dark-mode toggle's placement.
- The chosen language persists across reloads (browser storage), same mechanism as theme.
- Adding a future third locale should mean writing one new message file, not touching call sites — including the switcher UI itself, which must list whatever locales exist rather than assume exactly two.

**Non-Goals**

- Detecting the OS/browser language automatically — the default is always English; the user switches explicitly. (Avoids non-deterministic behavior in tests/CI and keeps this doc's scope small; can be revisited later.)
- A settings dialog (REQ-032) — the switcher lives directly in the toolbar for now, same rationale as dark mode.
- Translating SQL keywords/identifiers (`PRIMARY KEY`, column type names like `INTEGER`) or user-authored data (table/column names, comments) — only the app's own UI chrome is translated.
- Date/number formatting — no locale-sensitive formatting exists in the app today (`use-intl` has `useFormatter` available if that changes).
- Pluralization — no current string needs it, though ICU (which `use-intl` uses for message syntax) supports it if a future string does.

## Design

### `use-intl`

Chosen over a hand-rolled `Record`-of-strings dictionary because REQ-030's scope is explicitly expected to grow past two locales; `use-intl` gives ICU message syntax (interpolation, and pluralization/select if ever needed) and ergonomic React hooks (`useTranslations`, `useLocale`) without pulling in a routing-coupled framework like `next-intl`. Messages are plain TypeScript objects (not JSON) so `satisfies Messages` catches a missing or mistyped key at compile time in either locale.

### `src/i18n/` module (app-wide, not `pages/MainScreen`-scoped, since `NotFound` needs it too)

- `Locale.ts` — `type Locale = "en" | "ja"`, `LOCALES` (the ordered list the switcher iterates), `LOCALE_LABELS` (each language's own name, in that language — e.g. `{ en: "English", ja: "日本語" }`, shown as-is regardless of the active UI locale, matching every native language switcher's convention), `isLocale`.
- `messages/Messages.ts` — the `Messages` shape type (nested, one `string` field per message; ICU placeholders like `{name}` are documented per-field with a comment, not encoded in the type).
- `messages/en.ts` / `messages/ja.ts` — the two catalogs, each `satisfies Messages`.
- `use-intl.d.ts` — augments `use-intl`'s `AppConfig` with both `Locale` and `Messages`, so `useLocale()`/`useTranslations()` and their return values are fully typed (locale values, key paths, and interpolation argument names) across the app. Augmenting only `Messages` and leaving `Locale` on its `string` default is a trap: it type-checks locally but silently widens `useLocale()`'s return type app-wide, so anything expecting `Locale` (e.g. a menu's `currentLocale` prop) only gets caught by the real build (`tsc -b`), not a same-file `tsc --noEmit` sanity check.
- `LocaleProvider.tsx` — owns the current `Locale` and renders `use-intl`'s `<IntlProvider locale={locale} messages={...}>`; also provides a small sibling `useLocaleSwitch()` hook (`{ setLocale }`) since `IntlProvider` itself is read-only.

Components read translated text via `use-intl`'s own `useTranslations(namespace)` (returning `t(key, values?)`) and `useLocale()` (current locale) directly — no custom wrapper hook for reading. `LocaleProvider` persists like `useThemePreference`: seeded from an optional `initialLocale` prop (tests/stories), else `localStorage["ownsqldesigner:locale"]` if valid, else `"en"`; persists on change via `useEffect`.

### Provider requires wrapping — no safe standalone default

`use-intl`'s `useTranslations`/`useLocale` throw ("No intl context found") when rendered without an `IntlProvider` ancestor — there is no library-level fallback. Every component that reads translated text therefore needs a `LocaleProvider` ancestor, including in stories/tests that render it standalone via `composeStories`. Every story file for a component with translated text has a `LocaleProvider` decorator (or the local seeded-provider wrapper component gets `<LocaleProvider>` added, matching whichever pattern that file already used for `NotificationProvider` etc.); the same applies to hook tests that render through `SchemaWorkspaceProvider` (since `useSchemaPersistence` calls `useTranslations` for its failure-notification messages).

### Wiring

`MainScreen.tsx` wraps its provider stack with `LocaleProvider` (new `initialLocale` field on `MainScreenSeed`, seeded like the other providers there). `NotFound.tsx` wraps itself with its own `LocaleProvider` instance — the two pages are mutually exclusive routes, so two independent instances (both reading/writing the same `localStorage` key) behave as one consistent global preference to the user without needing a provider above the router.

Every component that needs translated text calls `useTranslations()` directly — no prop-drilling. This removes the need to thread strings through `MainScreenContent` → `MainScreenView` → leaf components the way `theme`/`onCycleTheme` are threaded today.

### Toolbar locale menu

An icon button (`LuLanguages` from `react-icons/lu`) next to the theme toggle opens a dropdown — not a cycling toggle — listing every entry in `LOCALES` with a checkmark on the current one, mirroring `SchemaMenu`'s existing dropdown pattern (a second `useToolbarMenu()` instance owns its own open/close state and outside-click handling; `LocaleMenu` and `SchemaMenu` now share their `menuBox`/`menuItem` styles from a new `dropdownMenu.ts` rather than each declaring their own copy). Adding `LocaleMenu` made the "close this on Escape" `useEffect` exist identically in three places (`Dialog`, `SchemaMenu`, and now `LocaleMenu`), so it was pulled into a shared `useEscapeKey(onEscape)` hook at `src/components/hooks/` — sibling to `src/components/parts/`, since it's used by both a page-scoped Toolbar menu and the cross-page `Dialog` part. A binary toggle was the initial design but was rejected once REQ-030 was scoped for a future third locale: a toggle has no generalization past two options, while a menu already scales to any length of `LOCALES` with no further UI change. Selecting an item calls `useLocaleSwitch().setLocale(locale)`. The trigger's `aria-label` still states the current language via an ICU message (`t("localeAriaLabel", { locale })`, mirroring the theme button's `aria-label={`Theme: ${theme}`}` pattern); menu item labels come from `LOCALE_LABELS`, not from `useTranslations`, since a language's own name doesn't change based on which language is currently active.

### Scope of string replacement

Every hardcoded string enumerated during exploration is replaced with a `useTranslations(namespace)` call: `toolbar`, `schemaMenu`, `localeMenu`, `loadSchema`, `sidePanel`, `exportSql`, `notificationBar`, `notifications` (the `useSchemaPersistence` failure messages — a hook can call `useTranslations` like any other hook), `tableNode`, `notFound`. Repeated strings (`"Cancel"`, generic action verbs `create`/`rename`/`delete`/`add`/`save`, the name-validity hints, "Name"/"Type"/"Comment" field labels) live under a shared `common` namespace used from every dialog instead of being redeclared per file.

Dialog titles and confirm messages are namespaced **per entity, not as one flat bag**: `schemaDialog`, `tableDialog`, `columnDialog`, `keyDialog`, `relationDialog` — each read by both `DialogHost` (titles, confirm messages) and, where the entity has one, the dialog component's own internal field labels (e.g. `columnDialog` also holds `sizeLabel`/`autoIncrementHint`/etc., read by `ColumnDialog.tsx` itself). An earlier version of this design used one flat `dialogs` namespace for every `DialogHost`-driven string; it was split after review because a single namespace mixing five unrelated dialogs' titles and messages became hard to scan and had no natural grouping. `tableNameDialog`/`schemaNameDialog` (the two dialogs with only a field-label namespace before this split) were folded into `tableDialog`/`schemaDialog` respectively rather than kept as a third, overlapping namespace per entity.

The domain layer (`src/domain`) already returns validity as booleans (`describeNameValidity`), not strings — translation only happens at the UI boundary that already maps those booleans to English text today; no domain changes were needed.

## Alternatives Considered

- **A hand-rolled dictionary Context** (plain `Record`-of-strings/functions, no library) — considered first for zero dependencies, but rejected once multiple locales beyond en/ja became an explicit future goal: it would mean hand-rolling interpolation, pluralization, and typed-key-path checking that `use-intl` already provides, and re-solving them as the message set grows.
- **`next-intl`** — rejected: it's `use-intl` plus Next.js-specific routing/server-component integration this app (a client-only SPA on `react-router`) doesn't use.
- **`createContext(null)` + throw-if-unwrapped custom locale hook, matching `NotificationContext`/`ActiveDialogContext`** — moot once `use-intl` was adopted: its own hooks already throw without a provider, so there's no reason to add a second custom context with the same behavior. The `LocaleProvider`/`useLocaleSwitch` split exists only because `IntlProvider` has no setter, not to re-implement translation lookup.
- **Prop-drilling `t` down from `MainScreenContent`, like `theme`** — rejected: `theme` has exactly one consumer (`Toolbar`) plus an imperative write to `document`. `t` is needed by a dozen+ components several levels deep (`DialogHost` → `ColumnDialog`, `SidePanel` → `KeyRow`, ...), turning nearly every intermediate component's props into a pass-through for a value it doesn't otherwise use.
