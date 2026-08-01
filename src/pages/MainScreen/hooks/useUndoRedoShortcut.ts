import { useEffect } from "react";
import { useActiveDialog } from "../ActiveDialogContext";
import { isTextInputElement } from "./keyboardShortcutGuards";
import { useUndoRedo } from "./useUndoRedo";

// Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z to redo. Ignored while a dialog is
// open or focus is in a text field, mirroring useDeleteKeyShortcut, so the
// shortcut doesn't fight a dialog's own form state or a browser-native undo
// inside a text field.
export function useUndoRedoShortcut(): void {
  const { activeDialog } = useActiveDialog();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (activeDialog !== null || isTextInputElement(document.activeElement)) {
        return;
      }
      if (!isUndoRedoShortcut(event)) {
        return;
      }
      if (event.shiftKey) {
        if (canRedo) {
          event.preventDefault();
          redo();
        }
        return;
      }
      if (canUndo) {
        event.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, undo, redo, canUndo, canRedo]);
}

function isUndoRedoShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z";
}
