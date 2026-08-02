import type { NodeChange, NodePositionChange } from "@xyflow/react";
import type { Position } from "../../../../domain/schema";

/** Grid unit (px) tables snap to on drag-end when snap-to-grid is enabled (REQ-006). */
export const SNAP_GRID_SIZE = 20;

export type CommittedMove = {
  id: string;
  position: Position;
};

export function selectCommittedMoves(changes: NodeChange[]): CommittedMove[] {
  return changes.flatMap((change) =>
    isCommittedPositionChange(change) ? [{ id: change.id, position: change.position }] : [],
  );
}

export function snapPosition(position: Position, gridSize: number): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

function isCommittedPositionChange(
  change: NodeChange,
): change is NodePositionChange & { position: Position } {
  return change.type === "position" && change.dragging === false && change.position !== undefined;
}
