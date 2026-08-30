import type { Schema, SchemaSummary } from "./schema";

// Storage-agnostic persistence boundary for schema documents; Promise-based
// even over synchronous backends (0002).
export type SchemaRepository = {
  list(): Promise<SchemaSummary[]>;
  load(id: string): Promise<Schema | null>;
  save(schema: Schema): Promise<void>;
  remove(id: string): Promise<void>;
  loadLastSchemaId(): Promise<string | null>;
  saveLastSchemaId(id: string): Promise<void>;
};
