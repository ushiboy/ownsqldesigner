import { isSqliteNameTaken } from "./nameComparison";

describe("isSqliteNameTaken", () => {
  it("returns false when the name has no case-insensitive match", () => {
    expect(isSqliteNameTaken("users", ["posts", "comments"])).toBe(false);
  });

  it("returns true for an exact match", () => {
    expect(isSqliteNameTaken("users", ["users"])).toBe(true);
  });

  it("returns true for a case-insensitive match", () => {
    expect(isSqliteNameTaken("Users", ["users"])).toBe(true);
  });
});
