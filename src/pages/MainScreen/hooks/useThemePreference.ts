import { useEffect, useLayoutEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ownsqldesigner:theme";
const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

export function useThemePreference(initialTheme?: Theme): {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  cycleTheme: () => void;
} {
  const [theme, setTheme] = useState<Theme>(() => initialTheme ?? readStoredTheme() ?? "system");
  const [osPrefersDark, setOsPrefersDark] = useState(getOsPrefersDark);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(event: MediaQueryListEvent) {
      setOsPrefersDark(event.matches);
    }
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (osPrefersDark ? "dark" : "light") : theme;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function cycleTheme() {
    setTheme((prev) => THEME_CYCLE[(THEME_CYCLE.indexOf(prev) + 1) % THEME_CYCLE.length]);
  }

  return { theme, resolvedTheme, cycleTheme };
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): Theme | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : null;
}

function getOsPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
