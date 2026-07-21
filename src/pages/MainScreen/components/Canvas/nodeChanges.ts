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

function isCommittedPositionChange(
  change: NodeChange,
): change is NodePositionChange & { position: Position } {
  return change.type === "position" && change.dragging === false && change.position !== undefined;
}
