# Table Drag and Position Persistence

- **Status**: Implemented
- **Created**: 2026-07-21
- **Updated**: 2026-07-21

## Context

[0004](0004-table-creation-and-placement.md) shipped table creation and placement with `nodesDraggable={false}` and no `position` field on the `Table` domain type, explicitly deferring REQ-001's "drag" to a follow-up. Trying the app surfaced a concrete problem this deferral caused: dragging a table node didn't move just that node — it panned the whole canvas instead, taking every node along with the viewport. This is React Flow's pane-pan-on-drag behavior kicking in because no node was individually draggable, not a selection bug. This doc completes REQ-001's drag by giving tables a real, persisted position.

## Goals / Non-Goals

**Goals**

- Real per-node dragging: grabbing a table moves only that table.
- Position is part of the persisted schema document (REQ-024: "diagram layout included").
- A sensible default placement for newly created tables — fulfills 0004's own open question that its grid layout was "a placeholder... open to revision once the drag-persistence branch lands."

**Non-Goals**

- Deleting a table — REQ-001's other deferred half, still out of scope.
- Multi-select / group drag (REQ-004) — Phase 2.

## Design

### Data model

`Table` gains a required `position: { x: number; y: number }` (new `Position` type/`positionSchema` in `schema.ts`). Required, not optional — every table has had a position since creation once this ships. No migration path needed: the table feature itself is not yet released to real users.

The placeholder grid-layout math (`GRID_COLUMNS`/`GRID_CELL_WIDTH`/`GRID_CELL_HEIGHT`, previously computed at render time in `Canvas.tsx`) moved into `schema.ts` as a private `defaultTablePosition(index)` helper used by `createTable`. "Where does a new table start" is now a domain-level default, not a rendering concern, because rendering no longer computes layout at all — `Canvas` just reads `table.position`.

A new `moveTable(schema, tableId, position, options?)` mirrors `renameTable`'s shape exactly: no-op on an unknown `tableId`, bumps `updatedAt` (position is layout content, same as a rename or comment edit).

### Canvas: real dragging, local node state, commit on drag end only

`nodesDraggable={false}` (and the per-node `draggable: false`) is removed — this is the actual fix for the pan-instead-of-drag bug. `Canvas` gains an `onMoveTable(tableId, position)` prop.

**Local node state is required for the drag to visually track the cursor.** The first implementation kept `nodes` fully derived from `tables` on every render, on the assumption that React Flow updates a dragged node's rendered position internally regardless of the app's own state. That assumption was wrong: React Flow only auto-applies `NodeChange`s to its own position state when using its _uncontrolled_ mode (`defaultNodes`/`useNodesState`'s internal store, gated internally on `hasDefaultNodes`); with fully controlled `nodes` — passing the array as a prop with no internal store backing it — `triggerNodeChanges` only calls the app's `onNodesChange`, and nothing updates the rendered position unless the app applies the change itself. Without that, a dragged node stayed visually still until drop, when the schema round-trip finally supplied a new `position` — exactly the "doesn't follow, jumps at drop" bug this was rewritten to fix.

The fix uses React Flow's own documented pattern for nodes "controlled from outside": local state via `useNodesState`, with `onNodesChange` applying every change (via the hook's own `handleNodesChange`, so in-progress drag ticks move the node smoothly), and a `useEffect` that resyncs the local state from `tables`/`selectedTableId` whenever they change for a reason other than the drag itself (create/rename/comment/select, or the drag's own commit echoing back through the schema). Since nothing else touches `tables` mid-drag, the effect never fights with a live gesture.

Position is still only **persisted** — i.e. `onMoveTable` is only called — on drag-end position changes (`type: "position"`, `dragging: false`, `position` defined); intermediate mousemove ticks (`dragging: true`) update the local visual state but don't call `onMoveTable`, since committing on every tick would flood `useSchemaWorkspace`'s single auto-save effect with a localStorage write per pointer move. This split — local state for smooth live rendering, external commit only at drag-end — mirrors the pattern already named as the target design in this repo's own design-doc template (`0001-table-node-canvas.md`'s example: "position field... updated on drag end only... to keep undo history small").

The "which `NodeChange`s count as a committed move" filter is a small pure function, `selectCommittedMoves`, in its own module (`components/Canvas/nodeChanges.ts`) rather than inline in `Canvas.tsx` — see Testing below for why.

### Testing: a documented jsdom limitation

Simulating a real React Flow drag gesture (mousedown → mousemove with a pointer delta → mouseup) in jsdom/Vitest is impractical: React Flow's drag math depends on real `getBoundingClientRect()`/pointer deltas that jsdom doesn't meaningfully provide, and this repo already needed nontrivial `ResizeObserver`/`offsetWidth`/`offsetHeight` shims (`src/test/setup.ts`) just to get _static_ node measurement working for click-selection tests. Attempting full drag-gesture coverage on top of that would be fragile for little value.

Instead, `selectCommittedMoves` — the one piece of drag logic that's actually pure and deterministic — is unit-tested directly with hand-built `NodeChange[]` fixtures (`nodeChanges.test.ts`), and the real drag gesture is verified manually via `pnpm dev`. This mirrors existing precedent for documenting jsdom gaps in this codebase (`Dialog.tsx`'s comment about `showModal()` not being implemented in jsdom; `src/test/setup.ts`'s `ResizeObserver` mock comments).

## Alternatives Considered

- **Nodes fully derived from `tables` on every render, no local state** — this was the first implementation, and it's wrong: it assumed React Flow tracks live drag position internally regardless of the app's own state, which only holds for React Flow's uncontrolled mode. With fully controlled `nodes` and no local state applying changes back, a dragged node never visually moved until drop. Replaced with local `useNodesState` synced from `tables` via an effect.
- **Committing position on every drag tick** — rejected: floods the single auto-save effect with a write per mousemove. Local `useNodesState` already gives smooth live rendering without needing to persist every tick.
- **Keeping layout purely computed, never stored** — rejected: this was 0004's explicit (and now fulfilled) deferral; there's a real value to persist once drag exists.
- **Grid-default constants staying in `Canvas.tsx`** — rejected: moved to `schema.ts`, since "where does a new table start" became a domain-level decision once `Table` owns a real `position` field, not a rendering concern.
