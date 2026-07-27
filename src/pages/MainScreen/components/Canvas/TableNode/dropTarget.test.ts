import type { ConnectionState } from "@xyflow/react";
import { isKeyColumnDragInProgress } from "./dropTarget";

describe("isKeyColumnDragInProgress", () => {
  it("is true while dragging from a target (key) handle", () => {
    const connection = { fromHandle: { type: "target" } } as ConnectionState;

    expect(isKeyColumnDragInProgress(connection)).toBe(true);
  });

  it("is false while dragging from a source handle", () => {
    const connection = { fromHandle: { type: "source" } } as ConnectionState;

    expect(isKeyColumnDragInProgress(connection)).toBe(false);
  });

  it("is false when no connection is in progress", () => {
    const connection = { fromHandle: null } as ConnectionState;

    expect(isKeyColumnDragInProgress(connection)).toBe(false);
  });
});
