import { useEffect } from "react";
import { type DialogKind, useActiveDialog } from "../ActiveDialogContext";

type DeleteKeyShortcutSelection = {
  tableId: string | null;
  relationId: string | null;
};

// Delete/Backspace opens the same confirm dialog as the side panel's
// delete button, rather than deleting immediately — every destructive
// action in this app is confirmation-gated, and keyboard delete is no
// exception. Ignored while a dialog is already open or focus is in a
// text field, so it doesn't interfere with typing. Relation and table
// selection are mutually exclusive (see MainScreen), so which dialog to
// open is unambiguous.
export function useDeleteKeyShortcut({ tableId, relationId }: DeleteKeyShortcutSelection): void {
  const { activeDialog, openDialog } = useActiveDialog();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardDelete(activeDialog, tableId, relationId)) {
        return;
      }
      if (isTextInputElement(document.activeElement)) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        openDialog(relationId !== null ? "deleteRelation" : "deleteTable");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, tableId, relationId, openDialog]);
}

function shouldIgnoreKeyboardDelete(
  activeDialog: DialogKind | null,
  tableId: string | null,
  relationId: string | null,
): boolean {
  return activeDialog !== null || (tableId === null && relationId === null);
}

function isTextInputElement(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}
