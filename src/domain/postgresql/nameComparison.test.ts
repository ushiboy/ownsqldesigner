import { isPostgresqlNameTaken } from "./nameComparison";

describe("isPostgresqlNameTaken", () => {
  it("returns false when the name has no case-insensitive match", () => {
    expect(isPostgresqlNameTaken("users", ["posts", "comments"])).toBe(false);
  });

  it("returns true for an exact match", () => {
    expect(isPostgresqlNameTaken("users", ["users"])).toBe(true);
  });

  it("returns true for a case-insensitive match", () => {
    expect(isPostgresqlNameTaken("Users", ["users"])).toBe(true);
  });
});
