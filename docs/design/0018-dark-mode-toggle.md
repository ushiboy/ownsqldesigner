# Dark Mode Toggle

- **Status**: Implemented
- **Created**: 2026-08-01
- **Updated**: 2026-08-01

## Context

`src/index.css` already ships a full dark palette, applied automatically via `@media (prefers-color-scheme: dark)`. There is no way for a user to override the OS setting, and no way to persist a choice — REQ-029 asks for explicit Light / Dark / System switching in the app.

## Goals / Non-Goals

**Goals**

- A toolbar control that cycles between Light, Dark, and System.
- The chosen mode persists across reloads (browser storage).
- "System" continues to track the OS preference live, including while the app is open.

**Non-Goals**

- A settings dialog (REQ-032) — theme lives directly in the toolbar for now, per the plan already noted in [0001](0001-main-screen.md).
- Per-component theme overrides or additional palettes beyond light/dark.

## Design

### Resolution moves from CSS media query to JS

Previously dark styling activated purely via `@media (prefers-color-scheme: dark)`. To support an explicit user override, resolution moves fully into JS: a hook always computes a concrete `"light" | "dark"` — even when the user's preference is `"system"` — and writes it to `document.documentElement.dataset.theme`. CSS drops the media query in favor of two unconditional attribute selectors, `:root[data-theme="light"]` and `:root[data-theme="dark"]`, each also setting `color-scheme` explicitly. This keeps a single source of truth instead of reconciling a media query against an attribute override.

### `useThemePreference` hook

`src/pages/MainScreen/hooks/useThemePreference.ts` — a plain hook (no Context; see Alternatives Considered), following the shape of existing hooks like `useUnsavedChangesWarning`:

- State: `theme: "light" | "dark" | "system"`, seeded from an optional `initialTheme` param (tests/stories), else from `localStorage["ownsqldesigner:theme"]` if valid, else `"system"`.
- Watches `window.matchMedia("(prefers-color-scheme: dark)")` for live OS changes while `theme === "system"`.
- `resolvedTheme` is derived: the OS match when `"system"`, otherwise `theme` itself.
- A `useLayoutEffect` writes `resolvedTheme` to `document.documentElement.dataset.theme` before paint, avoiding a flash.
- A `useEffect` persists the raw `theme` preference (not the resolved value) on change.
- `cycleTheme()` advances `light → dark → system → light`.

### Wiring

`theme` and `cycleTheme` are read once in `MainScreenContent` and passed down as props through `MainScreenView` to `Toolbar`, exactly like the existing `isSidePanelOpen` / `onToggleSidePanel` pair — both are single-level, UI-only state with no other consumers. `MainScreenSeed` gains `initialTheme` for story/test seeding.

### Toolbar button

One icon button in the toolbar's right-aligned group, next to the side-panel toggle. Clicking it calls `cycleTheme`. The icon (`LuSun` / `LuMoon` / `LuMonitor` from `react-icons/lu`) reflects the user's chosen mode, not the resolved color, so "System" is visually distinguishable from an explicit choice that happens to resolve the same way. `aria-label` states the current mode; this is a three-state cycle, not a boolean toggle, so it does not use `aria-pressed`.

## Alternatives Considered

- **A `ThemeContext` / `ThemeProvider`** — rejected: only one component (the toolbar button) and the document root need the value. The codebase already establishes shallow prop-drilling as the right call for exactly this shape of state (`isSidePanelOpen`), reserving Context for state read across many distant consumers.
- **Keeping the `@media` query for "system" and only adding an attribute override for explicit choices** — rejected: it would require two parallel resolution mechanisms (CSS media query and a JS-driven attribute) to stay consistent, and `:root:not([data-theme="light"])`-style selectors to suppress the media query when overridden. Resolving everything in JS and always setting `data-theme` is simpler and has one code path to test.
- **A dropdown menu (Light/Dark/System as separate options)** — rejected in favor of a single cycling button, consistent with the toolbar's existing icon-only buttons and to avoid introducing a new dropdown pattern (the only existing one, `SchemaMenu`, is for a longer, dynamic list) for a fixed 3-item choice.
