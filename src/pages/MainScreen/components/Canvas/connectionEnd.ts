import type { FinalConnectionState } from "@xyflow/react";
import { columnIdFromHandle } from "./TableNode/columnHandleId";

export type ForeignKeyDrop =
  | {
      kind: "newColumn";
      childTableId: string;
      referencedTableId: string;
      referencedColumnId: string;
    }
  | {
      kind: "existingColumn";
      childTableId: string;
      columnId: string;
      referencedTableId: string;
      referencedColumnId: string;
    };

type ConnectionDragSource = {
  referencedTableId: string;
  referencedColumnId: string;
};

/**
 * Detects the REQ-016 gesture: a drag started from a referenceable (key)
 * column's handle. Dropping precisely on an existing column's own (source)
 * handle links that column as the foreign key's child; dropping elsewhere
 * within a table's body creates a new child column there instead.
 * `dropTableId`/`dropColumnId` are resolved by the caller via DOM lookups —
 * xyflow's own Strict-mode connection matching isn't used for this
 * (reversed) drag direction, since the caller's `isValidConnection` always
 * rejects it to keep this resolver the single source of truth (see
 * docs/design/0012-foreign-key-child-column-generation.md).
 */
export function resolveForeignKeyDrop(
  connectionState: FinalConnectionState,
  dropTableId: string | null,
  dropColumnId: string | null,
): ForeignKeyDrop | null {
  const source = resolveConnectionDragSource(connectionState);
  if (source === null || dropTableId === null) {
    return null;
  }
  const { referencedTableId, referencedColumnId } = source;
  if (dropColumnId === referencedColumnId) {
    return null; // dropped back on the very column being dragged from
  }
  if (dropColumnId !== null) {
    return {
      kind: "existingColumn",
      childTableId: dropTableId,
      columnId: dropColumnId,
      referencedTableId,
      referencedColumnId,
    };
  }
  return { kind: "newColumn", childTableId: dropTableId, referencedTableId, referencedColumnId };
}

/** Whether a drag is in progress and started from a referenceable (key) column's handle. */
function resolveConnectionDragSource(
  connectionState: FinalConnectionState,
): ConnectionDragSource | null {
  const { fromHandle, fromNode } = connectionState;
  if (fromHandle === null || fromNode === null || fromHandle.type !== "target") {
    return null;
  }
  const referencedColumnId = columnIdFromHandle(fromHandle.id);
  if (referencedColumnId === null) {
    return null;
  }
  return { referencedTableId: fromNode.id, referencedColumnId };
}
