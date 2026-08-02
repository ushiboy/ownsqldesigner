import { useEffect, useState } from "react";

const STORAGE_KEY = "ownsqldesigner:showColumnDetails";

export function useColumnDetailsVisibility(initialShowColumnDetails?: boolean): {
  showColumnDetails: boolean;
  toggleShowColumnDetails: () => void;
} {
  const [showColumnDetails, setShowColumnDetails] = useState(
    () => initialShowColumnDetails ?? readStoredShowColumnDetails() ?? true,
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(showColumnDetails));
  }, [showColumnDetails]);

  return {
    showColumnDetails,
    toggleShowColumnDetails: () => setShowColumnDetails((prev) => !prev),
  };
}

function readStoredShowColumnDetails(): boolean | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "true" ? true : stored === "false" ? false : null;
}
