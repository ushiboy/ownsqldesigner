import { useEffect } from "react";
import { type DialogKind, useActiveDialog } from "../ActiveDialogContext";
import { isTextInputElement } from "./keyboardShortcutGuards";

type EscapeClearSelectionShortcutSelection = {
  hasTableSelection: boolean;
  columnId: string | null;
  keyId: string | null;
  relationId: string | null;
  clearSelection: () => void;
};

// Escape clears the canvas selection when no dialog is open, mirroring
// useDeleteKeyShortcut's guard shape. Dialog cancel-on-Escape is handled
// entirely inside Dialog.tsx and is unaffected — this hook only acts while
// no dialog is mounted.
export function useEscapeClearSelectionShortcut({
  hasTableSelection,
  columnId,
  keyId,
  relationId,
  clearSelection,
}: EscapeClearSelectionShortcutSelection): void {
  const { activeDialog } = useActiveDialog();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        shouldIgnoreEscapeClearSelection(
          activeDialog,
          hasTableSelection,
          columnId,
          keyId,
          relationId,
        )
      ) {
        return;
      }
      if (isTextInputElement(document.activeElement)) {
        return;
      }
      if (event.key === "Escape") {
        clearSelection();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, hasTableSelection, columnId, keyId, relationId, clearSelection]);
}

function shouldIgnoreEscapeClearSelection(
  activeDialog: DialogKind | null,
  hasTableSelection: boolean,
  columnId: string | null,
  keyId: string | null,
  relationId: string | null,
): boolean {
  return (
    activeDialog !== null ||
    (!hasTableSelection && columnId === null && keyId === null && relationId === null)
  );
}
