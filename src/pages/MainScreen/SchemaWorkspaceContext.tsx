import { type ReactNode, createContext, useContext } from "react";
import type { Schema, SchemaSummary, Table } from "../../domain/schema";
import type { SchemaRepository } from "../../domain/schemaRepository";
import {
  type HistoryActions,
  type SchemaActions,
  type SchemaWorkspace,
  useSchemaWorkspace,
} from "./hooks/useSchemaWorkspace";

const SchemaWorkspaceContext = createContext<SchemaWorkspace | null>(null);
// A stable empty array: Canvas resyncs React Flow's nodes off this
// identity, so a fresh `[]` per render would fight in-progress drags.
const NO_TABLES: Table[] = [];

type SchemaWorkspaceProviderProps = {
  repository: SchemaRepository;
  /** Non-null only in stories and tests that start with a schema loaded. */
  initialSchema?: Schema;
  children: ReactNode;
};

export function SchemaWorkspaceProvider({
  repository,
  initialSchema,
  children,
}: SchemaWorkspaceProviderProps) {
  const workspace = useSchemaWorkspace(repository, initialSchema);
  return <SchemaWorkspaceContext value={workspace}>{children}</SchemaWorkspaceContext>;
}

/** null only during the initial async restore tick. */
export function useCurrentSchema(): Schema | null {
  return useSchemaWorkspaceContext().currentSchema;
}

export function useTables(): Table[] {
  return useSchemaWorkspaceContext().currentSchema?.tables ?? NO_TABLES;
}

export function useSavedSchemas(): SchemaSummary[] {
  return useSchemaWorkspaceContext().savedSchemas;
}

export function useHasUnsavedChanges(): boolean {
  return useSchemaWorkspaceContext().hasUnsavedChanges;
}

export function useSchemaActions(): SchemaActions {
  return useSchemaWorkspaceContext();
}

export function useHistoryActions(): HistoryActions {
  const { undo, redo, canUndo, canRedo } = useSchemaWorkspaceContext();
  return { undo, redo, canUndo, canRedo };
}

function useSchemaWorkspaceContext(): SchemaWorkspace {
  const value = useContext(SchemaWorkspaceContext);
  if (value === null) {
    throw new Error("Schema workspace hooks must be used within a SchemaWorkspaceProvider");
  }
  return value;
}
