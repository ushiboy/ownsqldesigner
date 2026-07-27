import type { ConnectionState } from "@xyflow/react";

/**
 * Whether a REQ-016 gesture (a drag started from a referenceable/key handle)
 * is currently in progress — every table is a valid drop target for it,
 * including the table the drag started from (self-reference is allowed).
 */
export function isKeyColumnDragInProgress(connection: ConnectionState): boolean {
  return connection.fromHandle?.type === "target";
}
