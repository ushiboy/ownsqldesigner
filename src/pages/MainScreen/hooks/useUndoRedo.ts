import { useCanvasApiRef } from "../CanvasApiContext";
import { useHistoryActions } from "../SchemaWorkspaceContext";
import { useSelection } from "../SelectionContext";

export type UndoRedoControls = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

// Composes the workspace's raw undo/redo with clearing selection, so every
// caller (the toolbar button, the keyboard shortcut) shares one place that
// does both rather than each remembering to clear selection itself (see
// docs/design/0016-undo-redo.md). Guarded on canUndo/canRedo so a no-op
// undo/redo — nothing left on that stack — doesn't clear a valid selection.
//
// Table deselection goes through Canvas's own native API
// (`CanvasApiContext`, backed by React Flow's `unselectNodesAndEdges`)
// rather than through `SelectionContext` state, since React Flow — not this
// app — owns which table nodes are selected; `clearSelection` still handles
// column/key/relation, which are plain app state.
export function useUndoRedo(): UndoRedoControls {
  const { undo, redo, canUndo, canRedo } = useHistoryActions();
  const { clearSelection } = useSelection();
  const canvasApiRef = useCanvasApiRef();

  return {
    canUndo,
    canRedo,
    undo: () => {
      if (!canUndo) {
        return;
      }
      undo();
      clearSelection();
      canvasApiRef.current?.deselectAllTables();
    },
    redo: () => {
      if (!canRedo) {
        return;
      }
      redo();
      clearSelection();
      canvasApiRef.current?.deselectAllTables();
    },
  };
}
