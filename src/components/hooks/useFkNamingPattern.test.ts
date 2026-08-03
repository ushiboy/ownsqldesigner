import { act, renderHook } from "@testing-library/react";
import { useFkNamingPattern } from "./useFkNamingPattern";

const STORAGE_KEY = "ownsqldesigner:fkNamingPattern";

describe("useFkNamingPattern", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to tableColumn when nothing is stored", () => {
    const { result } = renderHook(() => useFkNamingPattern());

    expect(result.current.fkNamingPattern).toBe("tableColumn");
  });

  it("restores a previously stored value", () => {
    localStorage.setItem(STORAGE_KEY, "tableId");
    const { result } = renderHook(() => useFkNamingPattern());

    expect(result.current.fkNamingPattern).toBe("tableId");
  });

  it("falls back to tableColumn when the stored value is invalid", () => {
    localStorage.setItem(STORAGE_KEY, "bogus");
    const { result } = renderHook(() => useFkNamingPattern());

    expect(result.current.fkNamingPattern).toBe("tableColumn");
  });

  it("uses initialFkNamingPattern to seed state, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, "tableColumn");
    const { result } = renderHook(() => useFkNamingPattern("tableId"));

    expect(result.current.fkNamingPattern).toBe("tableId");
  });

  it("persists the value to storage on change", () => {
    const { result } = renderHook(() => useFkNamingPattern());

    act(() => result.current.setFkNamingPattern("tableId"));

    expect(localStorage.getItem(STORAGE_KEY)).toBe("tableId");
    expect(result.current.fkNamingPattern).toBe("tableId");
  });
});
