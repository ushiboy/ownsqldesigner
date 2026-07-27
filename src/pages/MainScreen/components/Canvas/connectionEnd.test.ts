import type { FinalConnectionState } from "@xyflow/react";
import { targetHandleId } from "./TableNode/columnHandleId";
import { resolveForeignKeyDrop } from "./connectionEnd";

const USERS_TABLE_ID = "users-table";
const USERS_ID_COLUMN_ID = "users-id-column";
const POSTS_TABLE_ID = "posts-table";
const POSTS_AUTHOR_ID_COLUMN_ID = "posts-author-id-column";

function buildConnectionState(fields: {
  fromHandleId: string;
  fromHandleType: "source" | "target";
  fromNodeId: string;
}): FinalConnectionState {
  return {
    fromHandle: { id: fields.fromHandleId, type: fields.fromHandleType, nodeId: fields.fromNodeId },
    fromNode: { id: fields.fromNodeId },
    toHandle: null,
  } as unknown as FinalConnectionState;
}

describe("resolveForeignKeyDrop", () => {
  it("resolves a new-column drop when dropped on a table's body (no column under the drop)", () => {
    const connectionState = buildConnectionState({
      fromHandleId: targetHandleId(USERS_ID_COLUMN_ID),
      fromHandleType: "target",
      fromNodeId: USERS_TABLE_ID,
    });

    expect(resolveForeignKeyDrop(connectionState, POSTS_TABLE_ID, null)).toEqual({
      kind: "newColumn",
      childTableId: POSTS_TABLE_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });
  });

  it("resolves an existing-column drop when dropped precisely on another column's source handle", () => {
    const connectionState = buildConnectionState({
      fromHandleId: targetHandleId(USERS_ID_COLUMN_ID),
      fromHandleType: "target",
      fromNodeId: USERS_TABLE_ID,
    });

    expect(
      resolveForeignKeyDrop(connectionState, POSTS_TABLE_ID, POSTS_AUTHOR_ID_COLUMN_ID),
    ).toEqual({
      kind: "existingColumn",
      childTableId: POSTS_TABLE_ID,
      columnId: POSTS_AUTHOR_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });
  });

  it("resolves a same-table existing-column drop (self-reference to a different existing column)", () => {
    const connectionState = buildConnectionState({
      fromHandleId: targetHandleId(USERS_ID_COLUMN_ID),
      fromHandleType: "target",
      fromNodeId: USERS_TABLE_ID,
    });

    expect(resolveForeignKeyDrop(connectionState, USERS_TABLE_ID, "users-email-column")).toEqual({
      kind: "existingColumn",
      childTableId: USERS_TABLE_ID,
      columnId: "users-email-column",
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });
  });

  it("returns null when dropped back on the same column being dragged from", () => {
    const connectionState = buildConnectionState({
      fromHandleId: targetHandleId(USERS_ID_COLUMN_ID),
      fromHandleType: "target",
      fromNodeId: USERS_TABLE_ID,
    });

    expect(resolveForeignKeyDrop(connectionState, USERS_TABLE_ID, USERS_ID_COLUMN_ID)).toBeNull();
  });

  it("returns null when no connection was in progress", () => {
    const connectionState = {
      fromHandle: null,
      fromNode: null,
    } as unknown as FinalConnectionState;

    expect(resolveForeignKeyDrop(connectionState, POSTS_TABLE_ID, null)).toBeNull();
  });

  it("returns null when the drag started from a source (non-key) handle", () => {
    const connectionState = buildConnectionState({
      fromHandleId: "source:" + USERS_ID_COLUMN_ID,
      fromHandleType: "source",
      fromNodeId: USERS_TABLE_ID,
    });

    expect(resolveForeignKeyDrop(connectionState, POSTS_TABLE_ID, null)).toBeNull();
  });

  it("returns null when the drop isn't resolved to any table (empty pane)", () => {
    const connectionState = buildConnectionState({
      fromHandleId: targetHandleId(USERS_ID_COLUMN_ID),
      fromHandleType: "target",
      fromNodeId: USERS_TABLE_ID,
    });

    expect(resolveForeignKeyDrop(connectionState, null, null)).toBeNull();
  });
});
