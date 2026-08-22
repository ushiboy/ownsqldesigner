# Multi-select and Group Move

- **Status**: Implemented
- **Created**: 2026-07-30
- **Updated**: 2026-08-22

## Context

[0005](0005-table-drag-and-position-persistence.md) explicitly deferred
"Multi-select / group drag (REQ-004)" to Phase 2, and
[0011](0011-main-screen-state-composition.md) predicted the shape of the
eventual change: "Multi-select changes the _shape_ of `selectedTableId`, not
the count." Both predictions held.

Before this change, `Canvas` drove React Flow's per-node `selected` flag
entirely from `SelectionContext`'s single-valued `selectedTableId`, and a
`useEffect` resynced `nodes` from `(tables, selectedTableId)` on every render.
React Flow's own selection engine (shift-click accumulate, rubber-band
box-select) already runs internally and reports every resulting selection
through `onSelectionChange`, but nothing consumed that event — the resync
effect silently overwrote whatever multi-selection React Flow had computed,
collapsing it back to a single id on the very next render. Group dragging
itself was unaffected (`selectCommittedMoves` already returned one
`CommittedMove` per node in a drag batch), but the layer underneath,
`useSchemaWorkspace`'s `moveTable`, only accepted one table at a time, so a
group drag would have produced N separate `setCurrentSchema` calls instead of
one atomic move.

## Goals / Non-Goals

**Goals**

- Shift+click accumulates table selection on the canvas; rubber-band
  (box-select) selects multiple tables.
- Dragging a multi-selection moves all selected tables together and persists
  all of their positions in one schema update (one `updatedAt` bump).
- Plain click / pane click still replace/clear selection as before.
- Existing single-table consumers (side panel, per-table dialogs, keyboard
  Delete) keep working unchanged when exactly one table is selected, and
  degrade to "nothing selected" when 0 or 2+ are selected.

**Non-Goals**

- Extending the side panel or single-table dialogs (rename, add column, add
  key, delete) to operate on N selected tables at once — no "delete N
  tables" flow. See Open Questions.
- Multi-select for relations/edges.
- Undo/redo (REQ-005) itself — `moveTables` is designed with REQ-005's later
  granularity in mind, but undo/redo is not implemented here.

## Design

### Selection state: derive, don't duplicate

`SelectionContext`'s `selectedTableId: string | null` state slot was
replaced with `selectedTableIds: ReadonlySet<string>`. `selectedTableId` is
now **derived** on every render: the sole id when exactly one table is
selected, `null` otherwise. This is the load-bearing choice — it cannot
drift out of sync with `selectedTableIds` because it isn't independent
state, so every existing consumer that reads `selectedTableId`
(`MainScreen`, `DialogHost`, `useDeleteKeyShortcut`) kept working with zero
code changes: it simply reads `null` (its pre-existing "nothing selected"
branch) whenever 0 or 2+ tables are selected. That derivation is also what
implements the Non-Goals boundary above for free — no "2+ selected, disable
this dialog" code exists anywhere, because those single-table dialogs are
only reachable from side-panel buttons that already don't render when
`selectedTableId` is `null`.

`setTableSelection(ids)` was added alongside `selectTable(id)` as the
canvas-driven whole-set replacement. Both guard against a no-op update (see
"A mount-time bug" below) rather than unconditionally writing state.

### Canvas: let React Flow own the selection state machine

React Flow v12's internal click/shift-click/box-select logic already
implements the toggle/replace/accumulate semantics REQ-004 needs, and
reports every resulting selection — plain click (replace), shift-click
(toggle), rubber-band drag, pane click (clear) — through the
`onSelectionChange` prop. Rather than hand-rolling shift-key detection in
`onNodeClick`, `onSelectionChange` was wired as the feed into
`SelectionContext.setTableSelection`, with `multiSelectionKeyCode="Shift"`
set so click-accumulate and rubber-band share one modifier. `onNodeClick`
and `onPaneClick` no longer touch table selection at all; they still clear
relation selection, since relation selection is not part of this mechanism.

`selectionKeyCode` (rubber-band trigger) and `panOnDrag` were left at their
defaults: React Flow already gates box-select vs. pan by whether
`selectionKeyCode` is held for that gesture, so no reconfiguration was
needed and plain unmodified pane-drag panning is unaffected.

The existing local-state resync `useEffect` (`setNodes(tablesToNodes(...))`)
was kept, re-parameterized on `selectedTableIds`. It still seeds
`nodes[].selected` for non-canvas-driven changes (schema switch, delete
cleanup). Since it now echoes back what `onSelectionChange` already reported,
the round trip is idempotent, not adversarial — the same pattern already
used for drag-position commits.

No new pure "reconciliation" helper module was added for click/shift/box-select
logic — React Flow's own store already owns all of it (confirmed by reading
`@xyflow/react`'s selection handling); duplicating it would be redundant and
risk subtle mismatches with, e.g., shift-click-to-toggle-off.

### Group move: one atomic domain call

`src/domain/schema/table.ts` gained `moveTables(schema, moves, options?)`,
mirroring `moveTable`'s shape: it updates every matching table's position and
bumps `updatedAt` once for the whole batch, and is a no-op (returns the same
`schema` reference) if no move matches an existing table id.
`useSchemaWorkspace` gained a corresponding `moveTables` action, following
the same `dismissNotification()` + per-table no-op-position filtering
convention as `moveTable`. `Canvas`'s `onNodesChange` handler now collects
`selectCommittedMoves(changes)` into one `onMoveTables` call instead of
looping `onMoveTable` per node.

N tables dragged together previously would have produced N separate
`setCurrentSchema` calls for one user gesture — N independent `updatedAt`
values and N autosave-worthy writes representing what is conceptually one
action. A single `moveTables` call gives one timestamp for the whole group
move and is the natural granularity for REQ-005's later undo/redo (one undo
step per drag gesture, not N partial ones).

### A mount-time bug: selection echo clearing column/key selection

While building this, `MainScreenView.test.tsx`'s "removes the column's
primary key when the checkbox is unticked on edit" test started failing: the
Primary Key checkbox rendered disabled immediately on mount, even though the
seeded story selected exactly the PK column.

Cause: React Flow's `onSelectionChange` fires once on mount, echoing
whatever selection state the initial `nodes` prop already encodes (in
addition to firing on genuine gestures). That mount call reached
`setTableSelection` with the same single table id already selected — but the
naive implementation unconditionally cleared `selectedColumnId`/
`selectedKeyId` as part of "the table selection changed," matching
`selectTable`'s pre-existing convention. So every mount silently wiped an
already-selected column/key, even though the table selection's actual
_content_ did not change.

Fix: `setTableSelection` (and `selectTable`, for the same reason) now
compares the incoming id set against the current one and no-ops — skipping
both the state write and the column/key clear — when they're identical. This
also avoids an unnecessary re-render on every Canvas mount, not just the
correctness fix.

## Alternatives Considered

- **Hand-rolled shift-click/box-select reconciliation in a new pure helper**
  — rejected: React Flow's internal store already implements this exactly;
  duplicating it is redundant and risks subtle mismatches.
- **`selectionOnDrag: true`** — rejected: would make every unmodified pane
  drag a rubber-band instead of a pan, a real regression against today's
  panning UX. The default Shift-gated box-select needs no such change.
- **A parallel `selectedTableIds` state kept independently alongside an
  unchanged `selectedTableId` state** — rejected: two pieces of state that
  must be kept in sync invites drift bugs; deriving one from the other
  removes the possibility entirely.
- **Looping `moveTable` per dragged node instead of adding `moveTables`** —
  rejected: N `setCurrentSchema`/`updatedAt` writes for one user gesture, and
  a worse starting point for REQ-005's undo granularity.
- **Unconditionally clearing column/key selection on every
  `setTableSelection` call** (the initial implementation) — rejected once the
  mount-echo bug above was found: it silently discards a valid column/key
  selection whenever the table selection is reported unchanged, which
  happens on every Canvas mount.

## Open Questions

- Whether/when to build full N-selection support in the side panel and
  dialogs (bulk rename, bulk delete). Currently, 2+ selected tables behave
  identically to "nothing selected" in the side panel and in keyboard
  Delete.
- ~~Whether a "N tables selected" side-panel affordance (distinguishing
  multi-selected from empty) is worth adding as a small follow-up
  polish.~~ Resolved by
  [0044](0044-side-panel-multiple-selection-count.md).
