import { useEffect, useRef, useState } from "react";
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
  removeColumn,
  removeForeignKey,
  removeKey,
  removeTable,
  renameSchema,
  renameTable,
  setColumnKeyMembership,
  updateColumn,
  updateKey,
  updateTableComment,
} from "../../../domain/schema";
import type { SchemaRepository } from "../../../domain/schemaRepository";
import { useNotification } from "../NotificationContext";

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

export type SchemaWorkspace = SchemaActions & {
  /** null only during the initial async restore tick. */
  currentSchema: Schema | null;
  savedSchemas: SchemaSummary[];
  /** True when the most recent autosave attempt failed to persist. */
  hasUnsavedChanges: boolean;
};

export function useSchemaWorkspace(
  repository: SchemaRepository,
  initialSchema?: Schema,
): SchemaWorkspace {
  // Frozen at mount so the two effects below stay correct even if the
  // caller hands over a fresh object identity on a later render.
  const [seededSchema] = useState(initialSchema);
  const [currentSchema, setCurrentSchema] = useState<Schema | null>(seededSchema ?? null);
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
        setCurrentSchema(restored ?? createSchema(DEFAULT_SCHEMA_NAME));
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

  return {
    currentSchema,
    savedSchemas,
    hasUnsavedChanges,
    createSchema: (name) => {
      dismissNotification();
      setCurrentSchema(createSchema(name));
    },
    loadSchemaFromFile: (schema) => {
      dismissNotification();
      setCurrentSchema(importSchema(schema));
    },
    selectSchema: (id) => {
      (async () => {
        const loaded = await repository.load(id);
        if (loaded !== null) {
          dismissNotification();
          setCurrentSchema(loaded);
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
      setCurrentSchema((prev) =>
        prev === null || prev.name === name ? prev : renameSchema(prev, name),
      );
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
        setCurrentSchema(await loadSuccessor(repository, summaries));
      })();
    },
    createTable: (name) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : createTable(prev, name)));
    },
    renameTable: (tableId, name) => {
      dismissNotification();
      setCurrentSchema((prev) => {
        if (prev === null) {
          return prev;
        }
        const table = prev.tables.find((t) => t.id === tableId);
        return isTableNameUnchanged(table, name) ? prev : renameTable(prev, tableId, name);
      });
    },
    updateTableComment: (tableId, comment) => {
      dismissNotification();
      setCurrentSchema((prev) => {
        if (prev === null) {
          return prev;
        }
        const table = prev.tables.find((t) => t.id === tableId);
        return isTableCommentUnchanged(table, comment)
          ? prev
          : updateTableComment(prev, tableId, comment);
      });
    },
    moveTable: (tableId, position) => {
      dismissNotification();
      setCurrentSchema((prev) => {
        if (prev === null) {
          return prev;
        }
        const table = prev.tables.find((t) => t.id === tableId);
        return isTablePositionUnchanged(table, position)
          ? prev
          : moveTable(prev, tableId, position);
      });
    },
    removeTable: (tableId) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : removeTable(prev, tableId)));
    },
    // `id` lets the caller know the new column's id up front, so it can also
    // create the column's PRIMARY KEY key in the same submit (see MainScreenView).
    addColumn: (tableId, fields, id) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : addColumn(prev, tableId, fields, { id })));
    },
    updateColumn: (tableId, columnId, fields) => {
      dismissNotification();
      setCurrentSchema((prev) =>
        prev === null ? prev : updateColumn(prev, tableId, columnId, fields),
      );
    },
    removeColumn: (tableId, columnId) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : removeColumn(prev, tableId, columnId)));
    },
    setColumnKeyMembership: (tableId, columnId, membership) => {
      dismissNotification();
      setCurrentSchema((prev) =>
        prev === null ? prev : setColumnKeyMembership(prev, tableId, columnId, membership),
      );
    },
    addKey: (tableId, fields) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : addKey(prev, tableId, fields)));
    },
    updateKey: (tableId, keyId, fields) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : updateKey(prev, tableId, keyId, fields)));
    },
    removeKey: (tableId, keyId) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : removeKey(prev, tableId, keyId)));
    },
    addForeignKey: (tableId, fields) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : addForeignKey(prev, tableId, fields)));
    },
    addForeignKeyWithNewColumn: (childTableId, referencedTableId, referencedColumnId) => {
      dismissNotification();
      setCurrentSchema((prev) =>
        prev === null
          ? prev
          : addForeignKeyWithNewColumn(prev, childTableId, referencedTableId, referencedColumnId),
      );
    },
    removeForeignKey: (tableId, foreignKeyId) => {
      dismissNotification();
      setCurrentSchema((prev) =>
        prev === null ? prev : removeForeignKey(prev, tableId, foreignKeyId),
      );
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
