import { useEffect, useState } from "react";
import {
  DEFAULT_SCHEMA_NAME,
  type Column,
  type Position,
  type Schema,
  type SchemaSummary,
  type Table,
  addColumn,
  createSchema,
  createTable,
  moveTable,
  removeColumn,
  renameSchema,
  renameTable,
  updateColumn,
  updateTableComment,
} from "../../domain/schema";
import type { SchemaRepository } from "../../domain/schemaRepository";
import { useNotification } from "./NotificationContext";

type SchemaWorkspace = {
  /** null only during the initial async restore tick. */
  currentSchema: Schema | null;
  savedSchemas: SchemaSummary[];
  createSchema: (name: string) => void;
  selectSchema: (id: string) => void;
  renameSchema: (name: string) => void;
  deleteCurrentSchema: () => void;
  createTable: (name: string) => void;
  renameTable: (tableId: string, name: string) => void;
  updateTableComment: (tableId: string, comment: string) => void;
  moveTable: (tableId: string, position: Position) => void;
  addColumn: (tableId: string, fields: Omit<Column, "id">) => void;
  updateColumn: (tableId: string, columnId: string, fields: Omit<Column, "id">) => void;
  removeColumn: (tableId: string, columnId: string) => void;
};

export function useSchemaWorkspace(repository: SchemaRepository): SchemaWorkspace {
  const [currentSchema, setCurrentSchema] = useState<Schema | null>(null);
  const [savedSchemas, setSavedSchemas] = useState<SchemaSummary[]>([]);
  // Failures surface through the notification context; each successful
  // operation clears any stale message.
  const { notify, dismissNotification } = useNotification();

  // Startup restore: the last-edited schema, or a fresh blank one on the
  // first visit (or when the last-edited pointer dangles).
  useEffect(() => {
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
  }, [repository]);

  // The single auto-save path: every mutation flows through currentSchema.
  useEffect(() => {
    if (currentSchema === null) {
      return;
    }
    let cancelled = false;
    (async () => {
      await repository.save(currentSchema);
      await repository.saveLastSchemaId(currentSchema.id);
      const summaries = await repository.list();
      if (!cancelled) {
        setSavedSchemas(summaries);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, currentSchema]);

  return {
    currentSchema,
    savedSchemas,
    createSchema: (name) => {
      dismissNotification();
      setCurrentSchema(createSchema(name));
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
    addColumn: (tableId, fields) => {
      dismissNotification();
      setCurrentSchema((prev) => (prev === null ? prev : addColumn(prev, tableId, fields)));
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
