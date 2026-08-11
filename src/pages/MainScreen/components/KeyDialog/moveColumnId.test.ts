import { moveColumnIdDown, moveColumnIdUp } from "./moveColumnId";

describe("moveColumnIdUp", () => {
  it("moves a column up, swapping it with its predecessor", () => {
    expect(moveColumnIdUp(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });

  it("does nothing when moving the first column up", () => {
    expect(moveColumnIdUp(["a", "b", "c"], "a")).toEqual(["a", "b", "c"]);
  });

  it("does nothing when the column id is not present", () => {
    expect(moveColumnIdUp(["a", "b", "c"], "z")).toEqual(["a", "b", "c"]);
  });
});

describe("moveColumnIdDown", () => {
  it("moves a column down, swapping it with its successor", () => {
    expect(moveColumnIdDown(["a", "b", "c"], "b")).toEqual(["a", "c", "b"]);
  });

  it("does nothing when moving the last column down", () => {
    expect(moveColumnIdDown(["a", "b", "c"], "c")).toEqual(["a", "b", "c"]);
  });

  it("does nothing when the column id is not present", () => {
    expect(moveColumnIdDown(["a", "b", "c"], "z")).toEqual(["a", "b", "c"]);
  });
});
