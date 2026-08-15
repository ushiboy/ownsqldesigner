import { isPostgresqlPrecisionValid, isPostgresqlSizeValid } from "./sizeAndPrecisionValidation";

describe("isPostgresqlSizeValid", () => {
  it("treats an empty size as always valid", () => {
    expect(isPostgresqlSizeValid("VARCHAR", "")).toBe(true);
    expect(isPostgresqlSizeValid("NUMERIC", "")).toBe(true);
  });

  it("requires a single positive integer for VARCHAR/CHAR", () => {
    expect(isPostgresqlSizeValid("VARCHAR", "255")).toBe(true);
    expect(isPostgresqlSizeValid("CHAR", "1")).toBe(true);
    expect(isPostgresqlSizeValid("VARCHAR", "0")).toBe(false);
    expect(isPostgresqlSizeValid("VARCHAR", "-1")).toBe(false);
    expect(isPostgresqlSizeValid("VARCHAR", "abc")).toBe(false);
    expect(isPostgresqlSizeValid("VARCHAR", "10,2")).toBe(false);
  });

  it("allows a single positive integer or a positive-integer[,scale] pair for NUMERIC", () => {
    expect(isPostgresqlSizeValid("NUMERIC", "10")).toBe(true);
    expect(isPostgresqlSizeValid("NUMERIC", "10,2")).toBe(true);
    expect(isPostgresqlSizeValid("NUMERIC", "10,0")).toBe(true);
    expect(isPostgresqlSizeValid("NUMERIC", "0")).toBe(false);
    expect(isPostgresqlSizeValid("NUMERIC", "-1")).toBe(false);
    expect(isPostgresqlSizeValid("NUMERIC", "abc")).toBe(false);
    expect(isPostgresqlSizeValid("NUMERIC", "10,2,3")).toBe(false);
  });

  it("treats any value as valid for a non-sizable type", () => {
    expect(isPostgresqlSizeValid("BOOLEAN", "5")).toBe(true);
    expect(isPostgresqlSizeValid("BOOLEAN", "abc")).toBe(true);
  });
});

describe("isPostgresqlPrecisionValid", () => {
  it("treats an empty precision as always valid", () => {
    expect(isPostgresqlPrecisionValid("TIMESTAMP", "")).toBe(true);
  });

  it("requires an integer from 0 to 6 for TIME/TIMESTAMP", () => {
    expect(isPostgresqlPrecisionValid("TIME", "0")).toBe(true);
    expect(isPostgresqlPrecisionValid("TIMESTAMP", "6")).toBe(true);
    expect(isPostgresqlPrecisionValid("TIMESTAMP", "-1")).toBe(false);
    expect(isPostgresqlPrecisionValid("TIMESTAMP", "7")).toBe(false);
    expect(isPostgresqlPrecisionValid("TIMESTAMP", "abc")).toBe(false);
    expect(isPostgresqlPrecisionValid("TIMESTAMP", "3.5")).toBe(false);
  });

  it("treats any value as valid for a non-precision-eligible type", () => {
    expect(isPostgresqlPrecisionValid("BOOLEAN", "99")).toBe(true);
    expect(isPostgresqlPrecisionValid("BOOLEAN", "abc")).toBe(true);
  });
});
