import { useCallback, useReducer, useState } from "react";
import {
  type Column,
  type ColumnKeyMembership,
  type FkNamingPattern,
  type ForeignKey,
  type Key,
  type Position,
  type Schema,
  type Table,
  addColumn,
  addForeignKey,
  addForeignKeyWithNewColumn,
  addKey,
  createSchema,
  createTable,
  importSchema,
  moveTable,
  moveTables,
  removeColumn,
  removeForeignKey,
  removeKey,
  removeTable,
  renameSchema,
  renameTable,
  restoreSchema,
  setColumnKeyMembership,
  updateColumn,
  updateKey,
  updateTableComment,
} from "../../../domain/schema";
import { useNotification } from "../NotificationContext";

// Bounds the undo/redo stacks so a long editing session can't grow them
// without limit. Exported so tests can exercise the cap without duplicating
// the number.
export const HISTORY_LIMIT = 100;

export type UndoableSchemaActions = {
  createSchema: (name: string) => void;
  loadSchemaFromFile: (schema: Schema) => void;
  renameSchema: (name: string) => void;
  createTable: (name: string) => void;
  renameTable: (tableId: string, name: string) => void;
  updateTableComment: (tableId: string, comment: string) => void;
  moveTable: (tableId: string, position: Position) => void;
  moveTables: (moves: { tableId: string; position: Position }[]) => void;
  removeTable: (tableId: string) => void;
  addColumn: (tableId: string, fields: Omit<Column, "id">, id?: string) => void;
  updateColumn: (tableId: string, columnId: string, fields: Omit<Column, "id">) => void;
  removeColumn: (tableId: string, columnId: string) => void;
  setColumnKeyMembership: (
    tableId: string,
    columnId: string,
    membership: ColumnKeyMembership,
  ) => void;
  addKey: (tableId: string, fields: Omit<Key, "id">) => void;
  updateKey: (tableId: string, keyId: string, fields: Omit<Key, "id">) => void;
  removeKey: (tableId: string, keyId: string) => void;
  addForeignKey: (tableId: string, fields: Omit<ForeignKey, "id">) => void;
  addForeignKeyWithNewColumn: (
    childTableId: string,
    referencedTableId: string,
    referencedColumnId: string,
    namingPattern?: FkNamingPattern,
  ) => void;
  removeForeignKey: (tableId: string, foreignKeyId: string) => void;
};

export type UndoableSchema = UndoableSchemaActions & {
  currentSchema: Schema | null;
  /** The schema this hook was seeded with, if any — useSchemaPersistence reads this back to know
   * whether to skip startup restore and the initial autosave write for an already-persisted seed. */
  seededSchema: Schema | undefined;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Escape hatch for useSchemaPersistence to push a freshly restored/loaded/successor schema in,
   * the same way createSchema/loadSchemaFromFile do below — bypassing undo history and, unlike
   * those two, without dismissing any notification (a startup restore has none to dismiss yet). */
  replaceSchema: (schema: Schema) => void;
};

// `currentSchema` and its undo/redo stacks are modeled as one reducer
// (rather than three independent `useState`s) because several call sites —
// most notably ColumnDialog's "add column, then set its key membership"
// submit (see DialogHost) — dispatch two edits synchronously in the same
// event handler. A reducer guarantees the second edit sees the first edit's
// result and its own distinct undo entry; three separate `useState`s
// updated from closure-read values would not, since none of those values
// are visible to a sibling call until the next render.
type WorkspaceHistoryState = {
  currentSchema: Schema | null;
  undoStack: Schema[];
  redoStack: Schema[];
};

type WorkspaceHistoryAction =
  | { type: "edit"; updater: (prev: Schema) => Schema }
  | { type: "editWithoutHistory"; updater: (prev: Schema) => Schema }
  | { type: "replace"; schema: Schema }
  | { type: "undo" }
  | { type: "redo" };

export function useUndoableSchema(initialSchema?: Schema): UndoableSchema {
  // Frozen at mount so a fresh object identity on a later render doesn't
  // reseed — see the type comment on `seededSchema` above for how
  // useSchemaPersistence relies on this.
  const [seededSchema] = useState(initialSchema);
  const [{ currentSchema, undoStack, redoStack }, dispatch] = useReducer(workspaceHistoryReducer, {
    currentSchema: seededSchema ?? null,
    undoStack: [],
    redoStack: [],
  });
  const { dismissNotification } = useNotification();

  function commitEdit(updater: (prev: Schema) => Schema) {
    dismissNotification();
    dispatch({ type: "edit", updater });
  }

  return {
    currentSchema,
    seededSchema,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo: () => {
      dismissNotification();
      dispatch({ type: "undo" });
    },
    redo: () => {
      dismissNotification();
      dispatch({ type: "redo" });
    },
    // Stable identity (dispatch is stable) so useSchemaPersistence's startup-restore
    // effect can safely depend on it without re-running every render.
    replaceSchema: useCallback((schema: Schema) => {
      dispatch({ type: "replace", schema });
    }, []),
    createSchema: (name) => {
      dismissNotification();
      dispatch({ type: "replace", schema: createSchema(name) });
    },
    loadSchemaFromFile: (schema) => {
      dismissNotification();
      dispatch({ type: "replace", schema: importSchema(schema) });
    },
    renameSchema: (name) => {
      dismissNotification();
      // Confirming an unchanged name is a no-op so it does not dirty updatedAt.
      dispatch({
        type: "editWithoutHistory",
        updater: (prev) => (prev.name === name ? prev : renameSchema(prev, name)),
      });
    },
    createTable: (name) => {
      commitEdit((prev) => createTable(prev, name));
    },
    renameTable: (tableId, name) => {
      commitEdit((prev) => {
        const table = prev.tables.find((t) => t.id === tableId);
        return isTableNameUnchanged(table, name) ? prev : renameTable(prev, tableId, name);
      });
    },
    updateTableComment: (tableId, comment) => {
      commitEdit((prev) => {
        const table = prev.tables.find((t) => t.id === tableId);
        return isTableCommentUnchanged(table, comment)
          ? prev
          : updateTableComment(prev, tableId, comment);
      });
    },
    moveTable: (tableId, position) => {
      commitEdit((prev) => {
        const table = prev.tables.find((t) => t.id === tableId);
        return isTablePositionUnchanged(table, position)
          ? prev
          : moveTable(prev, tableId, position);
      });
    },
    moveTables: (moves) => {
      commitEdit((prev) => {
        const changedMoves = moves.filter(
          (move) =>
            !isTablePositionUnchanged(
              prev.tables.find((t) => t.id === move.tableId),
              move.position,
            ),
        );
        return changedMoves.length === 0 ? prev : moveTables(prev, changedMoves);
      });
    },
    removeTable: (tableId) => {
      commitEdit((prev) => removeTable(prev, tableId));
    },
    // `id` lets the caller know the new column's id up front, so it can also
    // create the column's PRIMARY KEY key in the same submit (see MainScreenView).
    addColumn: (tableId, fields, id) => {
      commitEdit((prev) => addColumn(prev, tableId, fields, { id }));
    },
    updateColumn: (tableId, columnId, fields) => {
      commitEdit((prev) => updateColumn(prev, tableId, columnId, fields));
    },
    removeColumn: (tableId, columnId) => {
      commitEdit((prev) => removeColumn(prev, tableId, columnId));
    },
    setColumnKeyMembership: (tableId, columnId, membership) => {
      commitEdit((prev) => setColumnKeyMembership(prev, tableId, columnId, membership));
    },
    addKey: (tableId, fields) => {
      commitEdit((prev) => addKey(prev, tableId, fields));
    },
    updateKey: (tableId, keyId, fields) => {
      commitEdit((prev) => updateKey(prev, tableId, keyId, fields));
    },
    removeKey: (tableId, keyId) => {
      commitEdit((prev) => removeKey(prev, tableId, keyId));
    },
    addForeignKey: (tableId, fields) => {
      commitEdit((prev) => addForeignKey(prev, tableId, fields));
    },
    addForeignKeyWithNewColumn: (
      childTableId,
      referencedTableId,
      referencedColumnId,
      namingPattern,
    ) => {
      commitEdit((prev) =>
        addForeignKeyWithNewColumn(prev, childTableId, referencedTableId, referencedColumnId, {
          namingPattern,
        }),
      );
    },
    removeForeignKey: (tableId, foreignKeyId) => {
      commitEdit((prev) => removeForeignKey(prev, tableId, foreignKeyId));
    },
  };
}

function workspaceHistoryReducer(
  state: WorkspaceHistoryState,
  action: WorkspaceHistoryAction,
): WorkspaceHistoryState {
  switch (action.type) {
    case "edit": {
      if (state.currentSchema === null) {
        return state;
      }
      const next = action.updater(state.currentSchema);
      if (next === state.currentSchema) {
        return state;
      }
      return {
        currentSchema: next,
        undoStack: pushHistory(state.undoStack, state.currentSchema),
        redoStack: [],
      };
    }
    case "editWithoutHistory": {
      if (state.currentSchema === null) {
        return state;
      }
      const next = action.updater(state.currentSchema);
      return next === state.currentSchema ? state : { ...state, currentSchema: next };
    }
    case "replace":
      return { currentSchema: action.schema, undoStack: [], redoStack: [] };
    case "undo": {
      if (state.currentSchema === null || state.undoStack.length === 0) {
        return state;
      }
      const previous = state.undoStack[state.undoStack.length - 1]!;
      return {
        currentSchema: restoreSchema(state.currentSchema, previous),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: pushHistory(state.redoStack, state.currentSchema),
      };
    }
    case "redo": {
      if (state.currentSchema === null || state.redoStack.length === 0) {
        return state;
      }
      const next = state.redoStack[state.redoStack.length - 1]!;
      return {
        currentSchema: restoreSchema(state.currentSchema, next),
        undoStack: pushHistory(state.undoStack, state.currentSchema),
        redoStack: state.redoStack.slice(0, -1),
      };
    }
  }
}

function pushHistory(stack: Schema[], entry: Schema): Schema[] {
  const pushed = [...stack, entry];
  return pushed.length > HISTORY_LIMIT ? pushed.slice(pushed.length - HISTORY_LIMIT) : pushed;
}

function isTableNameUnchanged(table: Table | undefined, name: string): boolean {
  return table === undefined || table.name === name;
}

function isTableCommentUnchanged(table: Table | undefined, comment: string): boolean {
  return table === undefined || table.comment === comment;
}

function isTablePositionUnchanged(table: Table | undefined, position: Position): boolean {
  return (
    table === undefined || (table.position.x === position.x && table.position.y === position.y)
  );
}
