# Toolbar Export/Import Menu

- **Status**: Implemented
- **Created**: 2026-08-31
- **Updated**: 2026-08-31

## Context

The toolbar (`src/pages/MainScreen/components/Toolbar/Toolbar.tsx`) had
accumulated four separate export/import action buttons — "Export SQL",
"Export Mermaid", "Download JSON", and `<LoadSchemaButton />` ("Load
JSON") — alongside its other actions (schema rename/delete, undo/redo,
auto-align, add table, theme, column-details toggle, snap-to-grid,
locale, settings, side-panel toggle). The user asked for the toolbar to be
decluttered by grouping the four export/import actions into a single
dropdown menu.

## Goals / Non-Goals

**Goals**

- Consolidate "Export SQL", "Export Mermaid", "Download JSON", and "Load
  JSON" into one "Export/Import" dropdown menu, styled and behaved like
  the existing `SchemaMenu` trigger (text label + chevron).
- Reuse the existing dropdown-menu building blocks (`useToolbarMenu`,
  `useMenuRovingFocus`, `dropdownMenu.ts`'s `menuBox`/`menuItem`) so the
  new menu gets the same keyboard support (arrow-key roving focus,
  Home/End, Tab-closes, Escape-closes) as `SchemaMenu`/`LocaleMenu` for
  free.

**Non-Goals**

- No new export/import functionality — all four actions call the exact
  same dialogs/callbacks/file-input flow as before.
- No change to any dialog's own behavior (`ExportSqlDialog`,
  `ExportMermaidDialog`, the JSON download, or the `LoadSchemaButton`
  confirm flow).

## Design

New `ExportImportMenu.tsx`, structured like `LocaleMenu.tsx`: a
`role="menu"` div (`menuBox()`/`menuItem()` from `./dropdownMenu.ts`)
using `useEscapeKey(onClose)` and `useMenuRovingFocus({ itemCount: 4, ... })`.
"Export SQL"/"Export Mermaid" items call `useActiveDialog().openDialog`
directly, matching what `Toolbar.tsx` did before. "Download JSON" stays a
prop-driven `onDownloadSchema`/`canDownloadSchema` pair, since that
callback and its enabled state come from `MainScreenView.tsx` via
`useDownloadSchemaFile()` — unchanged.

The "Load JSON" item needed more than a restyle. The menu closes (and
unmounts `ExportImportMenu`) synchronously on click, before a `.click()`
on a hidden file input, so putting the file input inside the menu item
component made it get unmounted mid-flow: the native file picker's
`change` event fires later, on a real browser, but the DOM input it would
fire on is already gone by then — invisible to jsdom-based unit tests
(which upload directly against the input via `userEvent.upload`, bypassing
the click-and-wait-for-native-picker sequence entirely) but reproduced
live via `pnpm dev` + chrome-devtools-mcp's `upload_file`, where the
confirm dialog never appeared. Fixed by splitting the old
`LoadSchemaButton.tsx` into `LoadSchemaHandler.tsx` — renders only the
hidden file input, `pendingSchema` state, and `ConfirmDialog`, with no
visible button of its own — mounted unconditionally in `Toolbar.tsx`
(outside the menu's conditional render) and exposing an imperative
`openFilePicker()` via a React 19 `ref` prop + `useImperativeHandle`. The
"Load JSON" menu item itself is now a plain inline button in
`ExportImportMenu.tsx`, identical in shape to the other three items:
`onClick={() => { onClose(); onOpenLoadSchema(); }}`.

`Toolbar.tsx` gains a third `useToolbarMenu()` instance for this menu
(mirroring the existing schema/locale menu wrapper pattern), a
`loadSchemaHandleRef` for the handler above, and drops the four
standalone buttons and its direct `LoadSchemaButton` import.

No dedicated `ExportImportMenu.stories.tsx`/`.test.tsx` — following the
same precedent as `SchemaMenu`/`LocaleMenu`, which have neither; all three
are small presentational dropdowns exercised only through
`Toolbar.test.tsx`/`Toolbar.stories.tsx`.

### i18n

New `toolbar.exportImportMenuLabel` (trigger button text, "Export/Import")
and a new `exportImportMenu.ariaLabel` namespace (the menu's own
`aria-label`), matching the `schemaMenu`/`localeMenu` separation between a
trigger-adjacent label owned by `toolbar` and a menu's own `ariaLabel`
namespace. `toolbar.exportSql`/`exportMermaid`/`downloadJson` and
`loadSchema.buttonLabel` are unchanged — only their reading component
moved.

## Alternatives Considered

- **Icon-only trigger (no visible label)** — rejected via
  `AskUserQuestion`: a labeled trigger ("Export/Import ▾") makes the
  menu's purpose discoverable at a glance, matching the user's stated
  preference; an icon-only trigger would need a guessable icon for two
  distinct concepts (export and import) at once.
- **Leaving "Load JSON" as a standalone toolbar button** and only
  grouping the three export actions — rejected via `AskUserQuestion`: the
  user explicitly wants JSON import folded in alongside export, not left
  separate.

## References

- [0052 — Menu Roving Focus Keyboard Navigation](0052-menu-roving-focus-keyboard-navigation.md)
