import { act, renderHook } from "@testing-library/react";
import { useSnapToGrid } from "./useSnapToGrid";

const STORAGE_KEY = "ownsqldesigner:snapToGrid";

describe("useSnapToGrid", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to false when nothing is stored", () => {
    const { result } = renderHook(() => useSnapToGrid());

    expect(result.current.snapToGrid).toBe(false);
  });

  it("restores a previously stored value", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    const { result } = renderHook(() => useSnapToGrid());

    expect(result.current.snapToGrid).toBe(true);
  });

  it("falls back to false when the stored value is invalid", () => {
    localStorage.setItem(STORAGE_KEY, "solarized");
    const { result } = renderHook(() => useSnapToGrid());

    expect(result.current.snapToGrid).toBe(false);
  });

  it("uses initialSnapToGrid to seed state, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, "false");
    const { result } = renderHook(() => useSnapToGrid(true));

    expect(result.current.snapToGrid).toBe(true);
  });

  it("persists the value to storage on toggle", () => {
    const { result } = renderHook(() => useSnapToGrid());

    act(() => result.current.toggleSnapToGrid());

    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("toggles false -> true -> false", () => {
    const { result } = renderHook(() => useSnapToGrid(false));

    act(() => result.current.toggleSnapToGrid());
    expect(result.current.snapToGrid).toBe(true);

    act(() => result.current.toggleSnapToGrid());
    expect(result.current.snapToGrid).toBe(false);
  });
});
