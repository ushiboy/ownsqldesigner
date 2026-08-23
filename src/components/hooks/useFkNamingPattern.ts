import { DEFAULT_FK_NAMING_PATTERN, type FkNamingPattern } from "../../domain/schema";
import { usePersistedState } from "./usePersistedState";

const STORAGE_KEY = "ownsqldesigner:fkNamingPattern";
const VALID_PATTERNS: Set<string> = new Set<FkNamingPattern>(["tableColumn", "tableId"]);

export function useFkNamingPattern(initialFkNamingPattern?: FkNamingPattern): {
  fkNamingPattern: FkNamingPattern;
  setFkNamingPattern: (pattern: FkNamingPattern) => void;
} {
  const [fkNamingPattern, setFkNamingPattern] = usePersistedState(
    STORAGE_KEY,
    DEFAULT_FK_NAMING_PATTERN,
    initialFkNamingPattern,
    { parse: parseFkNamingPattern },
  );

  return { fkNamingPattern, setFkNamingPattern };
}

function parseFkNamingPattern(raw: string): FkNamingPattern | null {
  return VALID_PATTERNS.has(raw) ? (raw as FkNamingPattern) : null;
}
