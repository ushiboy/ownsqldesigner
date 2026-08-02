# Snap to Grid

- **Status**: Implemented
- **Created**: 2026-08-02
- **Updated**: 2026-08-02

## Context

REQ-006 asks for tables to snap to a grid while being dragged on the canvas, so tables can be aligned without eyeballing pixel positions. Table drag-end position commit already exists ([0005](0005-table-drag-and-position-persistence.md)): `Canvas`'s `onNodesChange` calls `onMoveTables` only for committed (`dragging: false`) position changes, via the pure `selectCommittedMoves` helper in `nodeChanges.ts`. This is the natural place to apply snapping, since it already isolates "which changes represent a real move to persist" as testable, pure logic.

## Goals / Non-Goals

**Goals**

- A toolbar toggle that turns grid-snapping on/off for table dragging.
- Defaults to off — flipping on drag behavior for all users by default would be a surprising change, unlike REQ-012's toggle which only affects a passive display.
- The choice persists across reloads (browser storage), independent of any general settings feature — same deferral pattern as [0021](0021-column-type-size-toggle.md).
- Applies uniformly to single-table drags and multi-select group moves (REQ-004): every dragged table's committed position is snapped independently.
- While enabled, the canvas visibly shows the grid tables snap to, so the effect reads as "snapping to a grid" rather than an invisible position adjustment (see Alternatives Considered below for why this was added after review).

**Non-Goals**

- A settings dialog (REQ-032) — this toggle lives directly in the toolbar for now, same as REQ-012's column-details toggle.
- Snapping during the drag gesture itself (live, per-pixel snapping while the cursor moves) — only the committed drag-end position is snapped, consistent with 0005's "commit on drag-end only" design.

## Design

### Grid size

A dedicated `SNAP_GRID_SIZE = 20` (px) constant in `nodeChanges.ts`, independent of the existing `GRID_COLUMNS`/`GRID_CELL_WIDTH`(260)/`GRID_CELL_HEIGHT`(160) constants in `src/domain/schema/table.ts`. Those size new-table default placement to roughly a full table node's footprint; a fine alignment grid for freeform dragging is a different concern with a much smaller natural unit, so a new constant was introduced rather than reusing those.

### `snapPosition` — pure function, `nodeChanges.ts`

```ts
export function snapPosition(position: Position, gridSize: number): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}
```

Kept alongside `selectCommittedMoves` as its own pure, independently unit-tested function, for the same reason 0005 gives for that module's existence: isolating drag-related pure logic from `Canvas.tsx` so it doesn't need a real React Flow drag gesture to test (jsdom can't meaningfully simulate one — see 0005's Testing section).

### Wiring

`Canvas` gains a `snapToGrid: boolean` prop. In the existing `onNodesChange` handler, after `selectCommittedMoves(changes)`, each move's position is passed through `snapPosition(position, SNAP_GRID_SIZE)` when `snapToGrid` is true, before calling `onMoveTables`. No change to the local `useNodesState`/resync logic was needed: once the snapped position is committed into the schema, the existing `tables`-driven resync effect already re-renders the node at its new (snapped) position — the same "settles into place" feedback the app already gives after any committed move.

### Visible grid (`Background` variant)

`Canvas` already renders React Flow's `<Background />` ([0020](0020-canvas-zoom.md)), which happened to default to a `dots` pattern with `gap=20` — numerically the same as `SNAP_GRID_SIZE`, but a 1px dot every 20px reads as a faint texture, not a grid a user can track a table snapping onto. `<Background>` now takes `gap={SNAP_GRID_SIZE}` explicitly (tying it to the actual snap unit instead of an incidental default) and switches `variant` between `BackgroundVariant.Dots` (unchanged default look, snap off) and `BackgroundVariant.Lines` (a visible line grid, snap on):

```tsx
<Background
  gap={SNAP_GRID_SIZE}
  variant={snapToGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots}
/>
```

This makes the toggle itself double as the visual cue for "snap mode is active," and gives dragging a table a visible target to land on.

### `useSnapToGrid` hook

`src/pages/MainScreen/hooks/useSnapToGrid.ts` — an exact mirror of `useColumnDetailsVisibility.ts`: boolean state seeded from an optional `initialSnapToGrid` param (tests/stories), else `localStorage["ownsqldesigner:snapToGrid"]` if valid, else `false`; a `useEffect` persists on change; `toggleSnapToGrid()` flips it.

### Wiring through the page

`snapToGrid`/`toggleSnapToGrid` are read once in `MainScreenContent` and passed down as props through `MainScreenView` to both `Toolbar` (the button) and `Canvas` (the snapping behavior), exactly like `showColumnDetails`/`toggleShowColumnDetails`. `MainScreenSeed` gains `initialSnapToGrid` for story/test seeding.

### Toolbar button

One icon button (`LuGrid3X3` from `react-icons/lu`) in the toolbar's right-aligned group, next to the column-details toggle. Strict boolean toggle: `aria-pressed={snapToGrid}` and `toolButton({ pressed: snapToGrid })`, matching the column-details button's shape.

## Alternatives Considered

- **Position-only snapping, no visible grid** — the first implementation of this doc's design; rejected after review because the resulting position wasn't visibly aligned to anything: the existing `Background`'s dot pattern happened to share `SNAP_GRID_SIZE`'s 20px spacing but was too faint (1px dots) to read as a grid, so a table snapping onto it looked indistinguishable from ordinary free dragging. Switching to a visible `Lines` background while snapping is on fixes this without adding a grid when the feature is off.
- **Always-on snapping, no toggle** — rejected: unlike REQ-012's passive display toggle, this changes drag _behavior_; opt-in avoids surprising existing users, and a toggle is what REQ-032's future "snap" setting is expected to persist anyway.
- **Reusing `GRID_CELL_WIDTH`/`GRID_CELL_HEIGHT` (260×160) as the snap grid** — rejected: those constants size default placement for _new_ tables to avoid overlap, not fine-grained alignment for freeform dragging. A 20px unit gives much finer control.
- **Snapping live during the drag (every pointer-move tick)** — rejected: 0005 already established committing position only at drag-end to avoid flooding the auto-save effect; live snapping would also require the local `useNodesState` to diverge from the raw cursor position mid-gesture, adding complexity for a purely cosmetic difference (the node already animates smoothly to its committed position via the existing resync effect).
