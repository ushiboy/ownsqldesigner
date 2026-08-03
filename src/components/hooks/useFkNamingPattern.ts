import { useEffect, useState } from "react";
import { DEFAULT_FK_NAMING_PATTERN, type FkNamingPattern } from "../../domain/schema";

const STORAGE_KEY = "ownsqldesigner:fkNamingPattern";
const VALID_PATTERNS: Set<string> = new Set<FkNamingPattern>(["tableColumn", "tableId"]);

export function useFkNamingPattern(initialFkNamingPattern?: FkNamingPattern): {
  fkNamingPattern: FkNamingPattern;
  setFkNamingPattern: (pattern: FkNamingPattern) => void;
} {
  const [fkNamingPattern, setFkNamingPattern] = useState(
    () => initialFkNamingPattern ?? readStoredFkNamingPattern() ?? DEFAULT_FK_NAMING_PATTERN,
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, fkNamingPattern);
  }, [fkNamingPattern]);

  return { fkNamingPattern, setFkNamingPattern };
}

function readStoredFkNamingPattern(): FkNamingPattern | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored !== null && VALID_PATTERNS.has(stored) ? (stored as FkNamingPattern) : null;
}
