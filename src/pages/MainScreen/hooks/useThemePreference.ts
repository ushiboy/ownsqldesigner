import { useEffect, useLayoutEffect, useState } from "react";
import { usePersistedState } from "../../../components/hooks/usePersistedState";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ownsqldesigner:theme";
const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

export function useThemePreference(initialTheme?: Theme): {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  cycleTheme: () => void;
} {
  const [theme, setTheme] = usePersistedState(STORAGE_KEY, "system", initialTheme, {
    parse: parseTheme,
  });
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

  function cycleTheme() {
    setTheme((prev) => THEME_CYCLE[(THEME_CYCLE.indexOf(prev) + 1) % THEME_CYCLE.length]);
  }

  return { theme, resolvedTheme, cycleTheme };
}

function parseTheme(raw: string): Theme | null {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : null;
}

function getOsPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
