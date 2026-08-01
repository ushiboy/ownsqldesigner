import { useHistoryActions } from "../SchemaWorkspaceContext";
import { useSelection } from "../SelectionContext";

// A second, later correction is needed on top of the double-`requestAnimationFrame`
// one below — see `deferClearSelection` for why one alone isn't reliably enough.
const SELECTION_CORRECTION_DELAY_MS = 200;

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
export function useUndoRedo(): UndoRedoControls {
  const { undo, redo, canUndo, canRedo } = useHistoryActions();
  const { clearSelection } = useSelection();

  return {
    canUndo,
    canRedo,
    undo: () => {
      if (!canUndo) {
        return;
      }
      undo();
      deferClearSelection(clearSelection);
    },
    redo: () => {
      if (!canRedo) {
        return;
      }
      redo();
      deferClearSelection(clearSelection);
    },
  };
}

// Clearing a currently-selected node's selection at the same time as (or
// soon after) a `tables` change that triggers React Flow's own dimension
// remeasurement can make React Flow's controlled-selection reconciliation
// briefly oscillate, reporting the node alternately selected and not, a few
// times, before settling — see the `isOscillating` guard in Canvas (a
// second, independent backstop against the same failure mode) and
// docs/design/0016-undo-redo.md for the full account. That settling isn't
// guaranteed to land on "deselected": whichever state the oscillation
// happened to be reporting when Canvas's guard recognized and stopped it is
// what sticks, and it can be the stale, still-selected one. Clearing
// selection twice — once after the oscillation window has had time to
// finish (deferring past two animation frames is not reliably past it) and
// once again shortly after — reliably lands on "deselected" as the last
// word in testing, without needing to detect that the first clear lost the
// race.
function deferClearSelection(clearSelection: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(clearSelection));
  setTimeout(clearSelection, SELECTION_CORRECTION_DELAY_MS);
}
