import { isPostgresqlDefaultValueValid } from "./defaultValueValidation";

describe("isPostgresqlDefaultValueValid", () => {
  it("treats an empty default value as always valid", () => {
    expect(isPostgresqlDefaultValueValid("BOOLEAN", "")).toBe(true);
    expect(isPostgresqlDefaultValueValid("INTEGER", "")).toBe(true);
  });

  it("treats NULL as valid for every type, case-insensitively", () => {
    expect(isPostgresqlDefaultValueValid("BOOLEAN", "NULL")).toBe(true);
    expect(isPostgresqlDefaultValueValid("INTEGER", "null")).toBe(true);
    expect(isPostgresqlDefaultValueValid("VARCHAR", "Null")).toBe(true);
  });

  it("requires TRUE/FALSE (case-insensitive) for BOOLEAN", () => {
    expect(isPostgresqlDefaultValueValid("BOOLEAN", "true")).toBe(true);
    expect(isPostgresqlDefaultValueValid("BOOLEAN", "FALSE")).toBe(true);
    expect(isPostgresqlDefaultValueValid("BOOLEAN", "hello")).toBe(false);
    expect(isPostgresqlDefaultValueValid("BOOLEAN", "1")).toBe(false);
  });

  it("rejects a keyword that is meaningless for BOOLEAN", () => {
    expect(isPostgresqlDefaultValueValid("BOOLEAN", "CURRENT_TIMESTAMP")).toBe(false);
  });

  it.each(["SMALLINT", "INTEGER", "BIGINT", "NUMERIC", "REAL", "DOUBLE PRECISION"])(
    "requires a numeric literal for %s",
    (type) => {
      expect(isPostgresqlDefaultValueValid(type, "42")).toBe(true);
      expect(isPostgresqlDefaultValueValid(type, "-1.5")).toBe(true);
      expect(isPostgresqlDefaultValueValid(type, "abc")).toBe(false);
      expect(isPostgresqlDefaultValueValid(type, "TRUE")).toBe(false);
    },
  );

  it("treats any value as valid for a type outside the validated families", () => {
    expect(isPostgresqlDefaultValueValid("VARCHAR", "anything")).toBe(true);
    expect(isPostgresqlDefaultValueValid("TIMESTAMP", "not-a-real-date")).toBe(true);
    expect(isPostgresqlDefaultValueValid("UUID", "abc")).toBe(true);
  });
});
