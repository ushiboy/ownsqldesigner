# Main Screen

- **Status**: Implemented
- **Created**: 2026-07-17
- **Updated**: 2026-07-18

## Context

ownsqldesigner needs its first real screen. The current code is still the
Vite starter template (Home / About / NotFound sample pages), and none of the
features in [Requirements](../requirements.md) have a UI to live in. Before
implementing individual features, this doc settles the overall composition of
the main screen: which regions exist, what each region is responsible for,
and where later-phase features will go.

## Goals / Non-Goals

**Goals**

- Define the broad structure of the main screen: which regions exist and
  what each region is responsible for.
- Settle cross-cutting UX decisions: single-screen composition, schema
  switching, auto-save persistence, and how integrity violations are surfaced
  (REQ-023).
- Reserve a placement for later-phase features so they can be added without
  restructuring the screen.

**Non-Goals**

- Interaction flows inside each region — deletion triggers, dialog contents,
  behavior after destructive actions, naming rules, and what the side panel
  shows for selection kinds not covered here (edges, multi-select, ...).
  These are settled in the per-feature design docs.
- Implementation design of individual features (data model, validation rules,
  SQL generation, storage format) — each gets its own design doc.
- Visual design details (colors, spacing, typography).
- Touch / mobile layout (a requirements non-goal).

## Design

The app is a **single editor screen** at `/`. There are no other routes and
no page navigation; schema management happens in place via a dropdown and
dialogs. (Later amended by [0025](0025-fk-naming-pattern-setting.md): a
`/settings` route was added as a deliberate, isolated exception — see that
doc's Design section for why.)

### Persistence model

- On startup the app restores **the schema that was last edited** from
  browser storage. On the very first visit it creates a new blank schema
  (REQ-035).
- Every edit is **auto-saved** (REQ-024/025). There is no Save button and no
  unsaved state.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: [schema name ▾][✎][🗑]   [+ Add Table] [SQL] [⊞] │
├───────────────────────────────────────┬─────────────────┤
│ ┌───────────────────────────────────┐ │ Side panel      │
│ │ Notification bar (overlay,        │ │ (selection      │
│ │  hidden unless an edit rejected)  │ │  properties,    │
│ └───────────────────────────────────┘ │  toggleable)    │
│  Canvas (React Flow:                  │                 │
│   pan / table nodes / FK edges)       │                 │
└───────────────────────────────────────┴─────────────────┘
```

### Toolbar

The current schema name is a **dropdown menu** containing exactly two kinds
of entries: the list of saved schemas (selecting one switches to it,
REQ-025) and a "+ New Schema" item (REQ-035). Operations on the current
schema are deliberately kept out of the dropdown; next to the schema name
sit **two independent triggers**: a rename button (pencil icon, opens a
rename dialog, REQ-037) and a delete button (trash icon, opens a
confirmation dialog, REQ-036). Keeping switching, renaming, and deleting on
separate triggers avoids destructive actions hiding inside a menu used many
times a day.

The toolbar also holds Add Table (REQ-001), Export SQL (REQ-026), and, at
the right edge, the side-panel toggle. There is no Save button because of
auto-save.

### Canvas

The canvas is built on **React Flow (`@xyflow/react`)**: tables are custom
nodes (place / drag / delete, REQ-001) on a pannable surface (REQ-002), and
foreign-key relations are edges (curved, highlighted on selection, REQ-015)
created by connecting column handles (REQ-014). React Flow's built-ins
cover zoom (REQ-003), multi-select (REQ-004), minimap (REQ-007), and grid
snapping (REQ-006), which keeps the cost of the later phases low.

Note that React Flow's default edges are plain bezier curves between
handles — it does not route edges around nodes. If REQ-015's "auto-routed"
turns out to mean obstacle-avoiding routing rather than just automatic
curve placement, that needs custom edge work; the interpretation is settled
in the FK rendering design doc.

### Side panel

The right side panel edits the properties of the current selection: table
name and comment (REQ-009), the column list with add / edit / remove /
reorder (REQ-010) and per-dialect type selection (REQ-011), and key
definitions (REQ-013). When nothing is selected, instead of an empty state
the panel shows **read-only schema-level metadata** — creation date, table
count, and the like — so the space stays useful. A **toggle
button at the right edge of the toolbar** shows or hides the panel; when
hidden, the canvas takes the full width.

### Integrity violation feedback (REQ-023)

When an edit is rejected by an integrity rule, the reason is shown in a
**notification bar anchored directly under the toolbar** (hidden otherwise),
combined with inline messages in the side panel next to the offending field.
The bar is **absolutely positioned as an overlay on top of the canvas**, not
in the layout flow: showing or hiding it must never change the canvas
height, because a resize mid-interaction makes canvas operations feel
janky. Toasts are not used: they can disappear before the user notices
them.

### Dialogs

- **SQL Export** — DDL preview with copy (REQ-026).
- **Rename Schema** — REQ-037.
- **Delete Schema** — confirmation before deleting (REQ-036).

### Placement of later-phase features

Settled here so the layout does not need restructuring; details belong to
future docs. Zoom controls live inside the canvas; the minimap also lives
inside the canvas (exact position open, see Open Questions). Undo/redo,
theme, and language switching go into the toolbar. Validation warnings
before export (REQ-034) appear inside the SQL Export dialog. Schema file
download / load (REQ-027) sits in the toolbar next to Export SQL. A
settings button in the toolbar opens a settings dialog, the entry point for
REQ-032 (dialect, snap, FK naming pattern, and the display toggles of
REQ-012). ([0025](0025-fk-naming-pattern-setting.md) later replaced the
dialog part of this plan with a dedicated `/settings` route for the first
REQ-032 setting; snap, theme, and the display toggles were deliberately left
in the toolbar for now — see that doc.)

## Alternatives Considered

- **Hand-rolled canvas (absolutely positioned HTML nodes + SVG edge
  layer)** — rejected: pan, zoom, selection, edge routing, and the minimap
  would all have to be built and maintained by hand, while React Flow covers
  most of the canvas requirements with a proven implementation.
- **Two routes: schema list page + editor page** — rejected: in a
  browser-only tool exactly one schema is active at a time; a separate list
  page adds routing and ID management for little benefit over a dropdown.
- **Toast notifications for rejected edits** — rejected: toasts can be
  missed; a notification bar stays visible until addressed.
- **Notification bar in the layout flow (pushing the canvas down)** —
  rejected: the canvas resizes whenever the bar appears or disappears,
  which is easy to notice as jank while dragging or panning.

## Open Questions

- ~~Where inside the canvas the minimap should sit (bottom-right is the
  convention, but its relation to the zoom controls is to be decided in
  Phase 3).~~ Resolved in [0023](0023-minimap.md): `<MiniMap>` defaults to
  bottom-right, `<Controls>` defaults to bottom-left — no conflict, no
  custom `position` prop needed.
- With auto-save, REQ-028 (warn before leaving with unsaved changes) is
  likely unnecessary; revisit the requirement when implementing persistence.
