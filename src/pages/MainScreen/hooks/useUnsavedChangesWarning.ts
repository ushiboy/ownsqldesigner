import { useEffect } from "react";

// Guards the one real data-loss risk under the app's autosave model: a
// failed write (quota exceeded, private-mode storage, ...) leaves an edit
// that exists only in memory. Ordinary autosave latency is not guarded
// here, since it resolves in a microtask and is not a meaningful risk.
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
