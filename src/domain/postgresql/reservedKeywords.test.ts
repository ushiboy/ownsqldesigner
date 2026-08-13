import { isPostgresqlReservedKeyword } from "./reservedKeywords";

describe("isPostgresqlReservedKeyword", () => {
  it("returns false for a name that is not a PostgreSQL keyword", () => {
    expect(isPostgresqlReservedKeyword("users")).toBe(false);
  });

  it("returns true for a lowercase match", () => {
    expect(isPostgresqlReservedKeyword("order")).toBe(true);
  });

  it("returns true for an uppercase match", () => {
    expect(isPostgresqlReservedKeyword("ORDER")).toBe(true);
  });

  it("returns true for a mixed-case match", () => {
    expect(isPostgresqlReservedKeyword("Select")).toBe(true);
  });

  it("returns false for a name that merely contains a keyword as a substring", () => {
    expect(isPostgresqlReservedKeyword("order_items")).toBe(false);
  });
});
