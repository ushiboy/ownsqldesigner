import { act, renderHook } from "@testing-library/react";
import { useColumnDetailsVisibility } from "./useColumnDetailsVisibility";

const STORAGE_KEY = "ownsqldesigner:showColumnDetails";

describe("useColumnDetailsVisibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to true when nothing is stored", () => {
    const { result } = renderHook(() => useColumnDetailsVisibility());

    expect(result.current.showColumnDetails).toBe(true);
  });

  it("restores a previously stored value", () => {
    localStorage.setItem(STORAGE_KEY, "false");
    const { result } = renderHook(() => useColumnDetailsVisibility());

    expect(result.current.showColumnDetails).toBe(false);
  });

  it("falls back to true when the stored value is invalid", () => {
    localStorage.setItem(STORAGE_KEY, "solarized");
    const { result } = renderHook(() => useColumnDetailsVisibility());

    expect(result.current.showColumnDetails).toBe(true);
  });

  it("uses initialShowColumnDetails to seed state, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    const { result } = renderHook(() => useColumnDetailsVisibility(false));

    expect(result.current.showColumnDetails).toBe(false);
  });

  it("persists the value to storage on toggle", () => {
    const { result } = renderHook(() => useColumnDetailsVisibility());

    act(() => result.current.toggleShowColumnDetails());

    expect(localStorage.getItem(STORAGE_KEY)).toBe("false");
  });

  it("toggles true -> false -> true", () => {
    const { result } = renderHook(() => useColumnDetailsVisibility(true));

    act(() => result.current.toggleShowColumnDetails());
    expect(result.current.showColumnDetails).toBe(false);

    act(() => result.current.toggleShowColumnDetails());
    expect(result.current.showColumnDetails).toBe(true);
  });
});
