import { formatDefaultValue } from "./defaultValueFormatting";

describe("formatDefaultValue", () => {
  it("emits an integer raw", () => {
    expect(formatDefaultValue("42")).toBe("42");
  });

  it("emits a negative decimal raw", () => {
    expect(formatDefaultValue("-1.5")).toBe("-1.5");
  });

  it.each(["CURRENT_TIMESTAMP", "CURRENT_DATE", "CURRENT_TIME", "NULL", "TRUE", "FALSE"])(
    "emits the SQL keyword %s raw",
    (keyword) => {
      expect(formatDefaultValue(keyword)).toBe(keyword);
    },
  );

  it("matches a keyword case-insensitively, preserving the original casing", () => {
    expect(formatDefaultValue("current_timestamp")).toBe("current_timestamp");
  });

  it("quotes a non-numeric, non-keyword value as a string literal", () => {
    expect(formatDefaultValue("active")).toBe("'active'");
  });

  it("doubles an embedded single quote in a string literal", () => {
    expect(formatDefaultValue("O'Brien")).toBe("'O''Brien'");
  });

  it("quotes an arbitrary expression that is not on the recognized keyword list", () => {
    expect(formatDefaultValue("gen_random_uuid()")).toBe("'gen_random_uuid()'");
  });
});
