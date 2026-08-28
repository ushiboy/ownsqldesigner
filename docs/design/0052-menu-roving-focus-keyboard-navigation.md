# Menu Roving-Focus Keyboard Navigation

- **Status**: Implemented
- **Created**: 2026-08-28
- **Updated**: 2026-08-28

## Context

[0002](0002-schema-persistence-and-creation.md) and
[0003](0003-schema-selection-rename-delete.md) shipped the toolbar's schema
and locale dropdown menus (`SchemaMenu`/`LocaleMenu`) with `role="menu"`/
`role="menuitem"` markup, but only click-to-select and Escape-to-close
keyboard support. Both docs carried an Open Question asking whether the
menus should get full APG (WAI-ARIA Authoring Practices) arrow-key
navigation or stay click/Escape-only. This doc resolves that question.

## Goals / Non-Goals

**Goals**

- ArrowDown/ArrowUp roving focus between `menuitem`s, wrapping at the ends.
- Home/End jump to the first/last `menuitem`.
- Tab closes the menu (without hijacking the browser's own tab traversal).
- Opening a menu moves focus to the currently-selected item (or the first
  item if none is selected), instead of leaving focus on the trigger.
- Closing a menu via Escape or item selection returns focus to the trigger
  button.

**Non-Goals**

- Typeahead (single-character) navigation — neither menu's list is long
  enough today for its absence to be a real usability gap. Left as an
  Open Question for future work.
- Submenus / nested menus — both menus are flat lists.
- Restoring focus to the trigger after an outside click — the user has
  already placed focus elsewhere by clicking, and forcing it back would
  fight that action.

## Design

### `useMenuRovingFocus`

A new shared hook, `src/components/hooks/useMenuRovingFocus.ts`, alongside
`useEscapeKey.ts` (it depends on nothing page- or component-specific, just
an item count, an optional initial index, and an `onClose` callback).

It implements roving `tabIndex` (only the active `menuitem` has
`tabIndex={0}`, the rest `-1`) with real `.focus()` calls on the
underlying `<button>` elements, rather than `aria-activedescendant`: both
menus are short, non-virtualized static button lists, and the rest of the
codebase already treats DOM focus as the source of truth, so roving
`tabIndex` is the simpler, idiomatic fit.

On mount it focuses the item at `initialIndex` (APG's "focus the current
selection on open" behavior). A single `onKeyDown` handler on the
`role="menu"` container handles `ArrowDown`/`ArrowUp` (wrap-around),
`Home`/`End`, and `Tab` (calls `onClose()` without `preventDefault()`, so
native focus traversal proceeds normally once the menu is gone).

`SchemaMenu`/`LocaleMenu` each compute `itemCount` and `initialIndex` from
data they already receive (`savedSchemas`/`currentSchemaId` and
`LOCALES`/`currentLocale` respectively) and wire the hook's
`registerItemRef`/`getItemTabIndex` onto each `menuitem` button and
`onMenuKeyDown` onto the container div. No new props were needed on either
component.

### Focus return on close

`useToolbarMenu.ts` (the Toolbar-scoped hook already owning each menu's
open/close state) gained a `triggerRef`, attached by `Toolbar.tsx` to each
trigger `<button>`. Its `close()` function now focuses `triggerRef.current`
after closing. The existing outside-pointerdown handler was left
unchanged — it still closes the menu directly without going through
`close()`, so an outside click does not steal focus back from wherever the
user just clicked.

## Alternatives Considered

- **`aria-activedescendant`** — rejected: unnecessary indirection for
  short, non-virtualized, already-in-the-DOM button lists; no existing
  use of the pattern elsewhere in this codebase to be consistent with.
- **Clamping instead of wrapping at the list boundaries** — rejected:
  inconsistent with native OS menus and other reference implementations,
  and there's no reason these short lists need the extra friction.
- **Including typeahead now** — rejected: no current usability gap
  justifies the added character-buffer/timeout complexity; can be added
  later without revisiting this doc's other decisions.
- **Restoring focus to the trigger on outside-click too** — rejected:
  overrides the user's own focus placement for no benefit.

## Open Questions

- Add typeahead navigation if either menu's item list grows long enough
  for arrow-key-only scrolling to become tedious.
