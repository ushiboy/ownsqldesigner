import type { NodeChange } from "@xyflow/react";
import { selectCommittedMoves } from "./nodeChanges";

describe("selectCommittedMoves", () => {
  it("includes a drag-end position change", () => {
    const changes: NodeChange[] = [
      { id: "1", type: "position", position: { x: 100, y: 50 }, dragging: false },
    ];

    expect(selectCommittedMoves(changes)).toEqual([{ id: "1", position: { x: 100, y: 50 } }]);
  });

  it("excludes a mid-drag position change", () => {
    const changes: NodeChange[] = [
      { id: "1", type: "position", position: { x: 100, y: 50 }, dragging: true },
    ];

    expect(selectCommittedMoves(changes)).toEqual([]);
  });

  it("excludes a drag-end change with no position", () => {
    const changes: NodeChange[] = [{ id: "1", type: "position", dragging: false }];

    expect(selectCommittedMoves(changes)).toEqual([]);
  });

  it("excludes non-position change types", () => {
    const changes: NodeChange[] = [
      { id: "1", type: "select", selected: true },
      { id: "1", type: "dimensions", dimensions: { width: 150, height: 40 } },
      { id: "1", type: "remove" },
    ];

    expect(selectCommittedMoves(changes)).toEqual([]);
  });

  it("includes every committed move in a mixed batch", () => {
    const changes: NodeChange[] = [
      { id: "1", type: "position", position: { x: 100, y: 50 }, dragging: false },
      { id: "2", type: "select", selected: true },
      { id: "3", type: "position", position: { x: 200, y: 75 }, dragging: false },
    ];

    expect(selectCommittedMoves(changes)).toEqual([
      { id: "1", position: { x: 100, y: 50 } },
      { id: "3", position: { x: 200, y: 75 } },
    ]);
  });
});
