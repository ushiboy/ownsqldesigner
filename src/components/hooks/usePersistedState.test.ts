import { act, renderHook } from "@testing-library/react";
import { parseBoolean, usePersistedState } from "./usePersistedState";

const STORAGE_KEY = "test:persisted-state";

function parseUpperCase(raw: string): string | null {
  return raw === raw.toUpperCase() ? raw : null;
}

describe("usePersistedState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to the given default value when nothing is stored", () => {
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, "DEFAULT", undefined, { parse: parseUpperCase }),
    );

    expect(result.current[0]).toBe("DEFAULT");
  });

  it("restores a previously stored value", () => {
    localStorage.setItem(STORAGE_KEY, "STORED");
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, "DEFAULT", undefined, { parse: parseUpperCase }),
    );

    expect(result.current[0]).toBe("STORED");
  });

  it("falls back to the default value when the stored value fails to parse", () => {
    localStorage.setItem(STORAGE_KEY, "not-upper-case");
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, "DEFAULT", undefined, { parse: parseUpperCase }),
    );

    expect(result.current[0]).toBe("DEFAULT");
  });

  it("uses initialOverride to seed state, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, "STORED");
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, "DEFAULT", "OVERRIDE", { parse: parseUpperCase }),
    );

    expect(result.current[0]).toBe("OVERRIDE");
  });

  it("persists the value to storage on change, using the default serializer", () => {
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, "DEFAULT", undefined, { parse: parseUpperCase }),
    );

    act(() => result.current[1]("UPDATED"));

    expect(localStorage.getItem(STORAGE_KEY)).toBe("UPDATED");
    expect(result.current[0]).toBe("UPDATED");
  });

  it("persists the value using a custom serializer", () => {
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, 0, undefined, {
        parse: (raw) => Number(raw),
        serialize: (value: number) => `n:${value}`,
      }),
    );

    act(() => result.current[1](42));

    expect(localStorage.getItem(STORAGE_KEY)).toBe("n:42");
  });

  it("accepts a functional update, like useState", () => {
    const { result } = renderHook(() =>
      usePersistedState(STORAGE_KEY, 1, undefined, { parse: (raw) => Number(raw) }),
    );

    act(() => result.current[1]((prev) => prev + 1));

    expect(result.current[0]).toBe(2);
  });
});

describe("parseBoolean", () => {
  it("parses 'true' and 'false'", () => {
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean("false")).toBe(false);
  });

  it("returns null for anything else", () => {
    expect(parseBoolean("solarized")).toBeNull();
  });
});
