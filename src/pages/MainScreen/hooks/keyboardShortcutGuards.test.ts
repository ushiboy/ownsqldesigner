import { isTextInputElement } from "./keyboardShortcutGuards";

describe("isTextInputElement", () => {
  it("returns true for an input element", () => {
    expect(isTextInputElement(document.createElement("input"))).toBe(true);
  });

  it("returns true for a textarea element", () => {
    expect(isTextInputElement(document.createElement("textarea"))).toBe(true);
  });

  it("returns true for a select element", () => {
    expect(isTextInputElement(document.createElement("select"))).toBe(true);
  });

  it("returns false for a non-form element", () => {
    expect(isTextInputElement(document.createElement("div"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTextInputElement(null)).toBe(false);
  });
});
