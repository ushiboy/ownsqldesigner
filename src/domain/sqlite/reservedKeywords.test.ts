import { isSqliteReservedKeyword } from "./reservedKeywords";

describe("isSqliteReservedKeyword", () => {
  it("returns false for a name that is not a SQLite keyword", () => {
    expect(isSqliteReservedKeyword("users")).toBe(false);
  });

  it("returns true for a lowercase match", () => {
    expect(isSqliteReservedKeyword("order")).toBe(true);
  });

  it("returns true for an uppercase match", () => {
    expect(isSqliteReservedKeyword("ORDER")).toBe(true);
  });

  it("returns true for a mixed-case match", () => {
    expect(isSqliteReservedKeyword("Select")).toBe(true);
  });

  it("returns false for a name that merely contains a keyword as a substring", () => {
    expect(isSqliteReservedKeyword("order_items")).toBe(false);
  });
});
