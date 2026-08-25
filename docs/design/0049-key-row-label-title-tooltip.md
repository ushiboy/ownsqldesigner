# Key Row Label Title Tooltip

- **Status**: Implemented
- **Created**: 2026-08-25
- **Updated**: 2026-08-25

## Context

[0007](0007-table-key-management.md) left an open question: whether the
side panel's "Keys" section per-row label reads well once a table has many
composite keys with long column lists, noting "no truncation is designed
here; revisit if it proves visually noisy in practice." Picked via
`AskUserQuestion` from a survey of every design doc's Open Questions.

In practice, `SidePanel.tsx`'s `KeyRow` already applies Tailwind's
`truncate` class (`overflow-hidden text-ellipsis whitespace-nowrap`) to the
label `<span>`, so a long composite-key label already degrades gracefully
visually — it ellipsizes instead of wrapping or overflowing the panel. The
actual gap is discoverability: a CSS-ellipsized label has no way to reveal
its full text, so a table with e.g. a 5-column `UNIQUE` key shows
`UNIQUE (first_name, last_n…` with no way to read the rest short of opening
`KeyDialog` via the edit button.

## Goals / Non-Goals

**Goals**

- Let a user read a truncated key row's full label without opening
  `KeyDialog`, via the browser's native tooltip.

**Non-Goals**

- Any change to `describeKey`'s label format or content — this is
  presentation-only.
- Truncation/tooltip for the Columns or Relations sections' rows — not
  raised by 0007's open question, which is scoped to the Keys section
  specifically. Revisit separately if those prove to have the same gap.
- A custom tooltip component (positioning, delay, theming) — the native
  `title` attribute is sufficient for this and matches the zero-JS
  affordances already used elsewhere in the app (e.g. handle titles in
  `TableNode.tsx`).
- Keyboard-focus-triggered tooltip access — the label `<span>` has no
  `tabIndex`, so a sighted keyboard-only user (not using a screen reader)
  cannot trigger the native tooltip at all; a mouse is required. This is
  accepted as the same class of complexity as the rejected custom tooltip
  component above (reliable focus-triggered tooltips need their own
  visible-focus styling and cross-browser handling that a bare `title`
  attribute doesn't provide). Not a screen-reader regression: the span's
  accessible name is already the untruncated `label` text regardless of
  `title`, and the row's Edit/Delete buttons independently expose the full
  label via their own `aria-label`s.
- Touch-only devices — `title` tooltips are not reachable without hover or
  keyboard focus, so touch-only users get no tooltip either. Same accepted
  limitation as the keyboard-only case above.

## Design

`KeyRow`'s label `<span>` (`src/pages/MainScreen/components/SidePanel/SidePanel.tsx`)
gains a `title={label}` attribute alongside its existing `truncate
text-heading` class. The browser's native title tooltip shows the full,
untruncated label on hover, regardless of how much of it CSS ellipsizes
away. The span has no `tabIndex`, so this is a hover-only affordance — see
Non-Goals for why. No new component, i18n key, or data model change is
needed — `label` is already the full computed string from `describeKey`.

## Alternatives Considered

- **Truncating the string itself in `describeKey`** (e.g. capping to N
  column names with an "+2 more" suffix) — rejected: loses information the
  `title` approach preserves for free, and adds a magic length constant
  with no principled value (panel width, font, and zoom level all affect
  how much actually fits).
- **A custom hover-card/tooltip component** — rejected: over-engineered
  for a plain-text label; no existing tooltip component exists in this
  codebase to reuse, and building one is a much larger surface than this
  open question calls for.

## Open Questions

None.
