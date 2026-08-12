import type {
  Column,
  ColumnKeyMembership,
  FkNamingPattern,
  ForeignKey,
  Key,
  Position,
  Schema,
  SchemaSummary,
} from "../../../domain/schema";
import type { SchemaRepository } from "../../../domain/schemaRepository";
import { useSchemaPersistence } from "./useSchemaPersistence";
import { useUndoableSchema } from "./useUndoableSchema";

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
  moveColumnUp: (tableId: string, columnId: string) => void;
  moveColumnDown: (tableId: string, columnId: string) => void;
  setColumnKeyMembership: (
    tableId: string,
    columnId: string,
    membership: ColumnKeyMembership,
  ) => void;
  addKey: (tableId: string, fields: Omit<Key, "id">) => void;
  updateKey: (tableId: string, keyId: string, fields: Omit<Key, "id">) => void;
  removeKey: (tableId: string, keyId: string) => void;
  removeKeyCascadingForeignKeys: (tableId: string, keyId: string) => void;
  addForeignKey: (tableId: string, fields: Omit<ForeignKey, "id">) => void;
  addForeignKeyWithNewColumn: (
    childTableId: string,
    referencedTableId: string,
    referencedColumnId: string,
    namingPattern?: FkNamingPattern,
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

// Editing (undo/redo, CRUD) and persistence (startup restore, autosave, schema
// switching) are two distinct concerns — see useUndoableSchema.ts and
// useSchemaPersistence.ts respectively — composed here into the single
// surface the rest of the app consumes via SchemaWorkspaceContext.
export function useSchemaWorkspace(
  repository: SchemaRepository,
  initialSchema?: Schema,
): SchemaWorkspace {
  const editing = useUndoableSchema(initialSchema);
  const persistence = useSchemaPersistence(
    repository,
    editing.currentSchema,
    editing.seededSchema,
    editing.replaceSchema,
  );
  return { ...editing, ...persistence };
}
