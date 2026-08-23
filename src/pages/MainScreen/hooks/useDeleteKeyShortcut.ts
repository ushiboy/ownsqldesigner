import { useEffect } from "react";
import { type DialogKind, useActiveDialog } from "../ActiveDialogContext";
import { isTextInputElement } from "./keyboardShortcutGuards";

type DeleteKeyShortcutSelection = {
  hasTableSelection: boolean;
  relationId: string | null;
};

// Delete/Backspace opens the same confirm dialog as the side panel's
// delete button, rather than deleting immediately — every destructive
// action in this app is confirmation-gated, and keyboard delete is no
// exception. Ignored while a dialog is already open or focus is in a
// text field, so it doesn't interfere with typing. Relation and table
// selection are mutually exclusive (see MainScreen), so which dialog to
// open is unambiguous. `hasTableSelection` covers both a single selected
// table and a multi-table selection (2+); DialogHost reads the actual
// selection back out of SelectionContext to decide which to delete.
export function useDeleteKeyShortcut({
  hasTableSelection,
  relationId,
}: DeleteKeyShortcutSelection): void {
  const { activeDialog, openDialog } = useActiveDialog();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardDelete(activeDialog, hasTableSelection, relationId)) {
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
  }, [activeDialog, hasTableSelection, relationId, openDialog]);
}

function shouldIgnoreKeyboardDelete(
  activeDialog: DialogKind | null,
  hasTableSelection: boolean,
  relationId: string | null,
): boolean {
  return activeDialog !== null || (!hasTableSelection && relationId === null);
}
