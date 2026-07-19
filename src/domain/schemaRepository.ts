import type { Schema, SchemaSummary } from "./schema";

/**
 * Storage-agnostic persistence boundary for schema documents.
 * Promise-based even over synchronous backends so the implementation
 * can be swapped (e.g. for IndexedDB) without touching callers.
 */
export type SchemaRepository = {
  list(): Promise<SchemaSummary[]>;
  load(id: string): Promise<Schema | null>;
  save(schema: Schema): Promise<void>;
  loadLastSchemaId(): Promise<string | null>;
  saveLastSchemaId(id: string): Promise<void>;
};
