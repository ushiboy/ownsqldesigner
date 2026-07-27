import {
  columnIdFromHandle,
  sourceColumnIdFromHandle,
  sourceHandleId,
  targetHandleId,
} from "./columnHandleId";

describe("sourceHandleId / targetHandleId / columnIdFromHandle", () => {
  it("round-trips a column id through a source handle id", () => {
    expect(columnIdFromHandle(sourceHandleId("column-1"))).toBe("column-1");
  });

  it("round-trips a column id through a target handle id", () => {
    expect(columnIdFromHandle(targetHandleId("column-1"))).toBe("column-1");
  });

  it("produces distinct ids for the source and target side of the same column", () => {
    expect(sourceHandleId("column-1")).not.toBe(targetHandleId("column-1"));
  });

  it("returns null for null or undefined", () => {
    expect(columnIdFromHandle(null)).toBeNull();
    expect(columnIdFromHandle(undefined)).toBeNull();
  });

  it("returns null for an unrecognized handle id", () => {
    expect(columnIdFromHandle("not-a-handle-id")).toBeNull();
  });
});

describe("sourceColumnIdFromHandle", () => {
  it("returns the column id for a source handle id", () => {
    expect(sourceColumnIdFromHandle(sourceHandleId("column-1"))).toBe("column-1");
  });

  it("returns null for a target handle id", () => {
    expect(sourceColumnIdFromHandle(targetHandleId("column-1"))).toBeNull();
  });

  it("returns null for null or undefined", () => {
    expect(sourceColumnIdFromHandle(null)).toBeNull();
    expect(sourceColumnIdFromHandle(undefined)).toBeNull();
  });

  it("returns null for an unrecognized handle id", () => {
    expect(sourceColumnIdFromHandle("not-a-handle-id")).toBeNull();
  });
});
