# Auto-align Tables

- **Status**: Implemented
- **Created**: 2026-08-02
- **Updated**: 2026-08-02

## Context

REQ-008 (Phase 3) is the last unimplemented item in "Diagram editing
(canvas)" — every other requirement in that group already has a design doc
and a shipped implementation. Manually laying out a schema with many tables
and foreign keys is tedious; this doc adds a one-click re-layout that uses
the existing foreign-key graph to place referencing (child) tables next to
the referenced (parent) tables they point into.

Existing groundwork makes this a small addition rather than a new subsystem:

- `moveTables(schema, moves)` ([0015](0015-multi-select-and-group-move.md))
  already bulk-updates many table positions in one `updatedAt` bump, and
  `useUndoableSchema.ts`'s `moveTables` action already routes through the
  single `commitEdit` interception point ([0016](0016-undo-redo.md)), so one
  auto-align call gets undo/redo for free.
- `CanvasApiContext` ([0016](0016-undo-redo.md)) already gives callers
  outside the React Flow tree (the toolbar) an imperative handle into
  `Canvas`, currently exposing only `deselectAllTables`.
- The FK graph is already fully derivable from domain state:
  `Table.foreignKeys: ForeignKey[]` holds `{ referencedTableId, ... }` per
  child table, the same data `Canvas.tsx`'s `tablesToEdges` already reads
  for rendering ([0009](0009-foreign-key-relations.md)).
- `TableNode` ([0009](0009-foreign-key-relations.md)) renders every column's
  FK source handle fixed on its **right** edge and a target handle fixed on
  its **left** edge, regardless of where the node ends up on the canvas —
  this constrains which layout direction reads naturally (see Design).

## Goals / Non-Goals

**Goals**

- A toolbar button that re-lays-out every table on the canvas in one shot,
  using the FK graph so a referencing (child) table ends up to the left of
  the referenced (parent) table it points into, with FK connectors reading
  as short, direct lines rather than looping between mismatched sides.
- One undo step for the whole re-layout.
- Deterministic given the same schema and the same rendered node sizes.
- Tables with no FK relations, and cyclic/self-referencing FK graphs, still
  get placed somewhere sane without crashing.

**Non-Goals**

- Animating the transition between old and new positions.
- A settings dialog to configure spacing/direction (REQ-032, if ever
  wanted) — spacing constants are fixed.
- Auto-aligning only a selection — always re-lays-out every table.
- Composite-FK-aware layout weighting.

## Design

### New dependency: `@dagrejs/dagre`

`@dagrejs/dagre` (the actively-maintained fork xyflow's own docs recommend
for this exact use case) was added as a `dependencies` entry. It's
synchronous (no worker/WASM) and ships its own TypeScript types.

### Pure layout function: `autoAlignLayout.ts`

`src/pages/MainScreen/components/Canvas/autoAlignLayout.ts` exports:

```ts
export function computeAutoAlignedPositions(
  tables: Table[],
  nodeSizes: ReadonlyMap<string, { width: number; height: number }>,
): { tableId: string; position: Position }[];
```

A dagre graph (`rankdir: "LR"`) gets one node per table, sized from
`nodeSizes` — falling back to `domain/schema/table.ts`'s existing
`GRID_CELL_WIDTH`/`GRID_CELL_HEIGHT` (now exported) for any table not yet
measured, reusing the same "typical table footprint" constants `createTable`
already uses for its own default grid placement, rather than declaring a
second pair of magic numbers for the same concept.

**`LR`, not `TB`.** `TableNode`'s FK source handle is fixed on a column's
right edge and its target handle fixed on the left edge, no matter where
the node lands (see Context). A `TB` (top-to-bottom) layout was tried
first, ranking the referenced/parent table above the referencing/child
table — driving it with a real schema showed the connector looping from a
child's bottom-right source handle up and back to a parent's top-left
target handle, reading as backwards (see Alternatives Considered). Ranking
left-to-right instead keeps every connector a short, direct line: one edge
is added per non-self-referencing `ForeignKey`, in the domain model's own
direction, `table.id → foreignKey.referencedTableId` (child → parent, the
same direction `tablesToEdges` already renders) — dagre's `LR` layout ranks
an edge's source to the left of its target, so the child (the FK's source
side, right-edge handle) ends up left of the parent (the target side,
left-edge handle) it points into. Self-referencing FKs are simply not added
as edges (they carry no useful ranking information); the table itself is
still added as a node and gets placed.

After `dagre.layout(graph)`, each node's center-based `{x, y}` is converted
back to xyflow's top-left-based `position` by subtracting half the node's
width/height.

Unit tests assert structural properties rather than pinned pixel coordinates
(dagre's exact numbers aren't a contract worth freezing): a referencing
(child) table's `x` is less than its referenced (parent) table's `x`; no
two tables' resulting bounding boxes overlap; a self-referencing table and
an isolated (no-FK) table both still get a valid position.

### Wiring into `CanvasApiContext` / `Canvas`

`CanvasApi` gained `autoAlignTables: () => void`. `Canvas`'s
`CanvasApiBridge` now also receives `tables` and `onMoveTables` (both
already `Canvas`'s own props) and reads each node's measured size via
`useReactFlow().getNodes()` (falling back to `GRID_CELL_WIDTH`/`HEIGHT` for
any node without a `.measured` yet). `autoAlignTables` builds that size map,
calls `computeAutoAlignedPositions`, and passes the result straight to the
existing `onMoveTables` prop — the same commit path a group drag already
uses, so undo/redo, autosave, and the resync-preserves-`.selected` effect
([0016](0016-undo-redo.md)) all apply unchanged.

### Toolbar button

One-shot icon button (`LuNetwork`) in the toolbar's right-aligned group,
next to Undo/Redo — a triggered action, not a persisted toggle, so no
`aria-pressed`. It calls `useCanvasApiRef().current?.autoAlignTables()`
directly; no bespoke wrapper hook was added since, unlike `useUndoRedo`,
there's no extra composition (like clearing selection) to justify one.
Always enabled — auto-aligning an empty or single-table schema is a
harmless no-op courtesy of `moveTables`' existing no-op guard.

## Alternatives Considered

- **`rankdir: "TB"`, referenced (parent) table above referencing (child)
  table** — the first implementation of this doc's design; rejected after
  driving it with a real schema (a `users` table referenced by a
  `posts.users_id` foreign key, `posts` placed directly below `users`): the
  connector visibly looped from `posts`' bottom-right source handle up and
  back to `users`' top-left target handle instead of reading as a direct
  line, because `TableNode`'s handles are fixed to the left/right edges
  regardless of layout direction (see Context). `LR` avoids this entirely,
  since it only ever needs to connect a right-edge handle to a left-edge
  handle across a horizontal gap.
- **Plain grid re-layout** (extend `defaultTablePosition`'s existing grid
  math, no new dependency) — rejected: doesn't use the FK graph, so related
  tables can end up far apart in a schema with many relations, undermining
  the point of "auto-align" for an ER diagram.
- **Hand-rolled topological/layered layout** (Kahn's algorithm, in-house,
  falling back to grid placement for cycles) — rejected in favor of dagre:
  more code to write, test, and maintain for a well-solved problem, and
  dagre already handles disconnected subgraphs and is small/synchronous.
- **elkjs** — rejected: WASM-based, asynchronous (`layout()` returns a
  `Promise`), and a much heavier bundle footprint than needed for this
  app's scale; dagre's synchronous API also fits this app's existing
  "compute now, commit through one `moveTables` call" pattern more directly.
- **A bespoke `useAutoAlign` hook wrapping `useCanvasApiRef`** (mirroring
  `useUndoRedo`) — rejected: `useUndoRedo` earns its hook by composing two
  things (workspace history + selection clearing); auto-align only ever
  does one thing, so the toolbar button calls the ref directly.

## Open Questions

- Whether a fixed `nodesep`/`ranksep` is generous enough for very wide
  tables (many columns, type/size details shown). Not observed as a problem
  yet; revisit if dense schemas produce visibly cramped layouts.
