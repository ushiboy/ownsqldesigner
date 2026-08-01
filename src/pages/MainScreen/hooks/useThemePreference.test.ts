import { act, renderHook } from "@testing-library/react";
import { useThemePreference } from "./useThemePreference";

const STORAGE_KEY = "ownsqldesigner:theme";

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  let changeListener: ((event: MediaQueryListEvent) => void) | null = null;
  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
      changeListener = listener;
    },
    removeEventListener: () => {
      changeListener = null;
    },
  } as unknown as MediaQueryList;
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mediaQueryList));
  return {
    setMatches(next: boolean) {
      matches = next;
      changeListener?.({ matches: next } as MediaQueryListEvent);
    },
  };
}

describe("useThemePreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
  });

  it("defaults to system when nothing is stored", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useThemePreference());

    expect(result.current.theme).toBe("system");
  });

  it("restores a previously stored theme", () => {
    mockMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "dark");
    const { result } = renderHook(() => useThemePreference());

    expect(result.current.theme).toBe("dark");
  });

  it("falls back to system when the stored value is invalid", () => {
    mockMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "solarized");
    const { result } = renderHook(() => useThemePreference());

    expect(result.current.theme).toBe("system");
  });

  it("uses initialTheme to seed state, ignoring storage", () => {
    mockMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "dark");
    const { result } = renderHook(() => useThemePreference("light"));

    expect(result.current.theme).toBe("light");
  });

  it("persists the theme to storage on change", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useThemePreference());

    act(() => result.current.cycleTheme());

    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("cycles light -> dark -> system -> light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useThemePreference("light"));

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("dark");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("system");

    act(() => result.current.cycleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("resolves system to the current OS preference", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useThemePreference("system"));

    expect(result.current.resolvedTheme).toBe("dark");
  });

  it("reacts to OS preference changes while in system mode", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useThemePreference("system"));

    expect(result.current.resolvedTheme).toBe("light");

    act(() => media.setMatches(true));

    expect(result.current.resolvedTheme).toBe("dark");
  });

  it("sets data-theme on the document root for each resolved theme", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useThemePreference("light"));
    expect(document.documentElement.dataset.theme).toBe("light");

    act(() => result.current.cycleTheme());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
