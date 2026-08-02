import { useEffect, useState } from "react";

const STORAGE_KEY = "ownsqldesigner:snapToGrid";

export function useSnapToGrid(initialSnapToGrid?: boolean): {
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
} {
  const [snapToGrid, setSnapToGrid] = useState(
    () => initialSnapToGrid ?? readStoredSnapToGrid() ?? false,
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(snapToGrid));
  }, [snapToGrid]);

  return {
    snapToGrid,
    toggleSnapToGrid: () => setSnapToGrid((prev) => !prev),
  };
}

function readStoredSnapToGrid(): boolean | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "true" ? true : stored === "false" ? false : null;
}
