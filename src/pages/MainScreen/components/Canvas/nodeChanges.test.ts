import type { NodeChange } from "@xyflow/react";
import { isOscillating, selectCommittedMoves, type SelectionEcho } from "./nodeChanges";

/** Builds evenly-spaced echoes `intervalMs` apart, starting at t=0. */
function echoes(signatures: string[], intervalMs: number): SelectionEcho[] {
  return signatures.map((signature, index) => ({ signature, timestamp: index * intervalMs }));
}

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

describe("isOscillating", () => {
  it("is false with fewer than six reports", () => {
    expect(isOscillating(echoes(["a", "b", "a", "b", "a"], 5))).toBe(false);
  });

  it("is true for a fast, strict A,B,A,B alternation", () => {
    expect(isOscillating(echoes(["a", "b", "a", "b", "a", "b"], 5))).toBe(true);
  });

  it("is true for a fast 3-state cycle (A,A,B repeating)", () => {
    expect(isOscillating(echoes(["a", "a", "b", "a", "a", "b"], 5))).toBe(true);
  });

  it("is true when the values are table-id selection signatures", () => {
    expect(isOscillating(echoes(["1,2", "", "1,2", "", "1,2", ""], 5))).toBe(true);
  });

  it("is false when the same value repeats without alternating", () => {
    expect(isOscillating(echoes(["a", "a", "a", "a", "a", "a"], 5))).toBe(false);
  });

  it("is false once three or more distinct values appear in the window", () => {
    expect(isOscillating(echoes(["a", "b", "c", "a", "b", "c"], 5))).toBe(false);
  });

  it("is false when the same two states repeat but the reports are human-paced", () => {
    expect(isOscillating(echoes(["a", "b", "a", "b", "a", "b"], 200))).toBe(false);
  });
});
