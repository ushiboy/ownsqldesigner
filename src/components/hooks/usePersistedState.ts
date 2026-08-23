import { useEffect, useState } from "react";

type UsePersistedStateOptions<T> = {
  /** Parses a raw stored string into a value, or `null` if it isn't a valid one. */
  parse: (raw: string) => T | null;
  /** Serializes a value for storage. Defaults to `String`, which is only correct for values that are already primitives/strings. */
  serialize?: (value: T) => string;
};

/**
 * A `useState` synced to `localStorage`: seeded from `initialOverride` (for
 * stories/tests), falling back to a previously stored value, falling back to
 * `defaultValue`. Every change is written back to storage under `key`.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  initialOverride: T | undefined,
  { parse, serialize = String }: UsePersistedStateOptions<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(
    () => initialOverride ?? readStored(key, parse) ?? defaultValue,
  );

  useEffect(() => {
    window.localStorage.setItem(key, serialize(value));
  }, [key, value, serialize]);

  return [value, setValue];
}

/** A reusable `parse` for boolean-valued persisted state. */
export function parseBoolean(raw: string): boolean | null {
  return raw === "true" ? true : raw === "false" ? false : null;
}

function readStored<T>(key: string, parse: (raw: string) => T | null): T | null {
  const stored = window.localStorage.getItem(key);
  return stored === null ? null : parse(stored);
}
