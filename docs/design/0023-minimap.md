# Minimap

- **Status**: Implemented
- **Created**: 2026-08-02
- **Updated**: 2026-08-02

## Context

REQ-007 asks for a minimap overview with a draggable viewport. [0001](0001-main-screen.md)'s Design section already anticipated this: "React Flow's built-ins cover ... minimap (REQ-007) ... which keeps the cost of the later phases low" — the same "incidental React Flow freebie" category as [0020](0020-canvas-zoom.md)'s zoom controls. 0001 also left an Open Question about where the minimap should sit relative to the zoom controls; this doc resolves it.

## Goals / Non-Goals

**Goals**

- Render a minimap overview of the canvas with a draggable viewport (drag inside the minimap to pan the main canvas).
- Style it so it reads correctly in both light and dark app themes, reusing existing CSS custom property tokens — no new tokens.

**Non-Goals**

- A toolbar toggle / persisted show-hide preference — unlike REQ-006/REQ-012, REQ-007's wording implies no such control; the minimap is always rendered.
- Zoom-by-scroll on the minimap (`zoomable`) — not implied by "draggable viewport."
- Per-node highlighting for selected tables on the minimap.
- Threading app dark mode into React Flow's own `colorMode` prop / `Controls`' palette — a pre-existing, out-of-scope gap (`Controls` today always renders in xyflow's hardcoded light palette regardless of app theme); the minimap's own color props are set independently and don't depend on it.

## Design

`Canvas.tsx` renders `<MiniMap>` as a `<ReactFlow>` child, alongside the existing `<Background>`/`<Controls>`. Its default `position` (bottom-right) doesn't overlap `<Controls>`' default (bottom-left), so neither needs a custom `position` prop — this is what resolves 0001's open question.

`pannable` is set to `true`: xyflow's internal `XYMinimap` (in `@xyflow/system`) gates its d3-zoom drag/`'zoom'` listener behind this prop — without it, the minimap has no drag interaction at all, even though the viewport mask is rendered. `zoomable` is left at its default `false`: scroll-to-zoom while hovering the minimap isn't implied by "draggable viewport" and is out of scope.

Color props (`bgColor`, `nodeColor`, `nodeStrokeColor`, `maskColor`) are set to the app's existing CSS custom property tokens rather than left at xyflow's own hardcoded defaults, so the minimap matches app theme without touching `colorMode`. `bgColor` uses `--color-surface`, the same panel background the rest of the app uses. `nodeColor`/`nodeStrokeColor` use `--color-accent` — the first version of this doc paired `--color-surface` node fill with a `--color-edge` stroke to mirror `TableNode`'s unselected-card look, but at minimap scale (a few pixels per table) that made nodes nearly indistinguishable from the panel background; `--color-accent` gives every table a solid, clearly visible block regardless of theme. `maskColor` reuses `--color-accent-bg`, the app's one existing translucent accent token (already used for drop-target highlighting), for the "in-view" wash over the minimap.

No new props on `Canvas`, no new state/hook, no Toolbar change.

## Alternatives Considered

- **A toolbar show/hide toggle, like REQ-006/REQ-012** — rejected: REQ-007's wording implies no such control, and this is closer to 0020's "incidental freebie" category than [0022](0022-snap-to-grid.md)'s opt-in-behavior category.
- **Leaving MiniMap's color props unset (xyflow defaults)** — rejected: xyflow's own light/dark minimap defaults are keyed off its `colorMode` prop, which this app never sets (pre-existing gap); left unset, the minimap would always render in xyflow's light palette regardless of app theme.
- **Threading `colorMode` into `<ReactFlow>` as part of this change** — rejected: out of scope for REQ-007; would also affect `Controls`' unrelated styling, a separate pre-existing gap.
