import type { NodeChange, NodePositionChange } from "@xyflow/react";
import type { Position } from "../../../../domain/schema";

export type CommittedMove = {
  id: string;
  position: Position;
};

export function selectCommittedMoves(changes: NodeChange[]): CommittedMove[] {
  return changes.flatMap((change) =>
    isCommittedPositionChange(change) ? [{ id: change.id, position: change.position }] : [],
  );
}

export type SelectionEcho = {
  signature: string;
  timestamp: number;
};

// Requires at least this many recent reports to judge a run of them as
// oscillation, rather than a burst of genuine, distinct gestures.
const OSCILLATION_MIN_REPORTS = 6;
// Reports this close together are not something a human gesture (click,
// keyboard nav) produces; only real ones this fast get treated as a runaway
// echo instead of legitimate rapid input.
const OSCILLATION_WINDOW_MS = 500;
// Beyond this many distinct selections within the window, treat it as
// varied genuine activity rather than a stuck echo.
const OSCILLATION_MAX_DISTINCT = 2;

// True once the most recent reports revisit at most two distinct selection
// states, all within a short window — the signature of React Flow's own
// selection reconciliation echoing a selection change back and forth
// indefinitely. The period of that echo isn't fixed (observed as both a
// 2-state and a 3-state cycle across different edits), so this checks
// "few distinct states, reported abnormally fast" rather than matching one
// exact repeating pattern. Reproduces when `selectedTableIds` transitions to
// empty at the same time as `tables` changes, as undo/redo's clearSelection
// does (see docs/design/0016-undo-redo.md and the comment above Canvas's
// `handleSelectionChange`).
export function isOscillating(history: readonly SelectionEcho[]): boolean {
  if (history.length < OSCILLATION_MIN_REPORTS) {
    return false;
  }
  const recent = history.slice(-OSCILLATION_MIN_REPORTS);
  const elapsed = recent[recent.length - 1]!.timestamp - recent[0]!.timestamp;
  if (elapsed > OSCILLATION_WINDOW_MS) {
    return false;
  }
  const distinctStates = new Set(recent.map((echo) => echo.signature));
  // At least 2: a single value repeating fast is redundant but harmless —
  // the selection setter it feeds already no-ops on an unchanged value.
  return distinctStates.size >= 2 && distinctStates.size <= OSCILLATION_MAX_DISTINCT;
}

function isCommittedPositionChange(
  change: NodeChange,
): change is NodePositionChange & { position: Position } {
  return change.type === "position" && change.dragging === false && change.position !== undefined;
}
