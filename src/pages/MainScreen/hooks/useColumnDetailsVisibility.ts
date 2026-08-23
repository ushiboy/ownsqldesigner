import { parseBoolean, usePersistedState } from "../../../components/hooks/usePersistedState";

const STORAGE_KEY = "ownsqldesigner:showColumnDetails";

export function useColumnDetailsVisibility(initialShowColumnDetails?: boolean): {
  showColumnDetails: boolean;
  toggleShowColumnDetails: () => void;
} {
  const [showColumnDetails, setShowColumnDetails] = usePersistedState(
    STORAGE_KEY,
    true,
    initialShowColumnDetails,
    { parse: parseBoolean },
  );

  return {
    showColumnDetails,
    toggleShowColumnDetails: () => setShowColumnDetails((prev) => !prev),
  };
}
