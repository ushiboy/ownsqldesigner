import { parseBoolean, usePersistedState } from "../../../components/hooks/usePersistedState";

const STORAGE_KEY = "ownsqldesigner:snapToGrid";

export function useSnapToGrid(initialSnapToGrid?: boolean): {
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
} {
  const [snapToGrid, setSnapToGrid] = usePersistedState(STORAGE_KEY, false, initialSnapToGrid, {
    parse: parseBoolean,
  });

  return {
    snapToGrid,
    toggleSnapToGrid: () => setSnapToGrid((prev) => !prev),
  };
}
