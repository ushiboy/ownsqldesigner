import { useEffect, useReducer, useRef, useState } from "react";
import {
  DEFAULT_SCHEMA_NAME,
  type Column,
  type ColumnKeyMembership,
  type ForeignKey,
  type Key,
  type Position,
  type Schema,
  type SchemaSummary,
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
import type { SchemaRepository } from "../../../domain/schemaRepository";
import { useNotification } from "../NotificationContext";

// Bounds the undo/redo stacks so a long editing session can't grow them
// without limit. Exported so tests can exercise the cap without duplicating
// the number.
export const HISTORY_LIMIT = 100;

export type SchemaActions = {
  createSchema: (name: string) => void;
  selectSchema: (id: string) => void;
  loadSchemaFromFile: (schema: Schema) => void;
  renameSchema: (name: string) => void;
  deleteCurrentSchema: () => void;
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
  ) => void;
  removeForeignKey: (tableId: string, foreignKeyId: string) => void;
};

export type HistoryActions = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export type SchemaWorkspace = SchemaActions &
  HistoryActions & {
    /** null only during the initial async restore tick. */
    currentSchema: Schema | null;
    savedSchemas: SchemaSummary[];
    /** True when the most recent autosave attempt failed to persist. */
    hasUnsavedChanges: boolean;
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

export function useSchemaWorkspace(
  repository: SchemaRepository,
  initialSchema?: Schema,
): SchemaWorkspace {
  // Frozen at mount so the two effects below stay correct even if the
  // caller hands over a fresh object identity on a later render.
  const [seededSchema] = useState(initialSchema);
  const [{ currentSchema, undoStack, redoStack }, dispatch] = useReducer(workspaceHistoryReducer, {
    currentSchema: seededSchema ?? null,
    undoStack: [],
    redoStack: [],
  });
  const [savedSchemas, setSavedSchemas] = useState<SchemaSummary[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Failures surface through the notification context; each successful
  // operation clears any stale message.
  const { notify, dismissNotification } = useNotification();
  // A stable handle to the latest `notify`: the autosave effect below keys
  // off `currentSchema` only, so it must not re-run just because some
  // unrelated notify() call elsewhere changed the notification context's
  // function identity.
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // Startup restore: the last-edited schema, or a fresh blank one on the
  // first visit (or when the last-edited pointer dangles). A seeded
  // workspace skips it, so the seed survives past the first tick.
  useEffect(() => {
    if (seededSchema !== undefined) {
      return;
    }
    let cancelled = false;
    (async () => {
      const lastSchemaId = await repository.loadLastSchemaId();
      const restored = lastSchemaId === null ? null : await repository.load(lastSchemaId);
      if (!cancelled) {
        dispatch({ type: "replace", schema: restored ?? createSchema(DEFAULT_SCHEMA_NAME) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, seededSchema]);

  // The single auto-save path: every mutation flows through currentSchema.
  useEffect(() => {
    if (currentSchema === null) {
      return;
    }
    let cancelled = false;
    (async () => {
      // A still-untouched seed is by definition already persisted, so it is
      // not written straight back; the summary list is still refreshed so
      // the schema menu has the same contents it would have in the app.
      if (currentSchema !== seededSchema) {
        try {
          await repository.save(currentSchema);
          await repository.saveLastSchemaId(currentSchema.id);
        } catch {
          // Quota exceeded, private-mode storage, etc: the edit exists only
          // in memory. Surface it and let the beforeunload guard (see
          // useUnsavedChangesWarning) stop the user from losing it silently.
          if (!cancelled) {
            setHasUnsavedChanges(true);
            notifyRef.current("Could not save your changes. Leaving this page may lose them.");
          }
          return;
        }
      }
      if (!cancelled) {
        setHasUnsavedChanges(false);
      }
      const summaries = await repository.list();
      if (!cancelled) {
        setSavedSchemas(summaries);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, currentSchema, seededSchema]);

  // The single interception point for diagram-content edits: dispatches an
  // "edit" action, which pushes the pre-edit schema onto the undo stack and
  // clears the redo stack, but only when `updater` actually changes
  // something. Every diagram-content action below already returns the same
  // `prev` reference for a no-op edit (an unchanged name/position, an
  // unknown id, ...), so that existing convention is reused here rather
  // than re-checked.
  function commitEdit(updater: (prev: Schema) => Schema) {
    dismissNotification();
    dispatch({ type: "edit", updater });
  }

  return {
    currentSchema,
    savedSchemas,
    hasUnsavedChanges,
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
    createSchema: (name) => {
      dismissNotification();
      dispatch({ type: "replace", schema: createSchema(name) });
    },
    loadSchemaFromFile: (schema) => {
      dismissNotification();
      dispatch({ type: "replace", schema: importSchema(schema) });
    },
    selectSchema: (id) => {
      (async () => {
        const loaded = await repository.load(id);
        if (loaded !== null) {
          dismissNotification();
          dispatch({ type: "replace", schema: loaded });
          return;
        }
        // The entry vanished (e.g. deleted in another tab) or is corrupt:
        // keep the current schema, surface the failure, and refresh the
        // list so the stale entry disappears.
        const name = savedSchemas.find((summary) => summary.id === id)?.name;
        notify(
          name === undefined
            ? "Could not load the selected schema. It may have been deleted or corrupted."
            : `Could not load "${name}". It may have been deleted or corrupted.`,
        );
        setSavedSchemas(await repository.list());
      })();
    },
    renameSchema: (name) => {
      dismissNotification();
      // Confirming an unchanged name is a no-op so it does not dirty updatedAt.
      dispatch({
        type: "editWithoutHistory",
        updater: (prev) => (prev.name === name ? prev : renameSchema(prev, name)),
      });
    },
    deleteCurrentSchema: () => {
      if (currentSchema === null) {
        return;
      }
      const { id } = currentSchema;
      (async () => {
        // The removal completes before the successor becomes current, so the
        // auto-save effect can only ever see the successor — the deleted
        // document cannot be written back. The last-schema-id pointer is
        // left dangling here; the successor's auto-save overwrites it.
        await repository.remove(id);
        const summaries = await repository.list();
        dismissNotification();
        dispatch({ type: "replace", schema: await loadSuccessor(repository, summaries) });
      })();
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
    addForeignKeyWithNewColumn: (childTableId, referencedTableId, referencedColumnId) => {
      commitEdit((prev) =>
        addForeignKeyWithNewColumn(prev, childTableId, referencedTableId, referencedColumnId),
      );
    },
    removeForeignKey: (tableId, foreignKeyId) => {
      commitEdit((prev) => removeForeignKey(prev, tableId, foreignKeyId));
    },
  };
}

// The most-recently-updated remaining schema, mirroring startup-restore
// semantics; a blank default schema when none remain (or the successor
// entry fails to load).
async function loadSuccessor(
  repository: SchemaRepository,
  summaries: SchemaSummary[],
): Promise<Schema> {
  const successor = summaries.toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  if (successor === undefined) {
    return createSchema(DEFAULT_SCHEMA_NAME);
  }
  return (await repository.load(successor.id)) ?? createSchema(DEFAULT_SCHEMA_NAME);
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
