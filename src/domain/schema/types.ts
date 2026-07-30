import { z } from "zod";

export const DEFAULT_SCHEMA_NAME = "New Schema";

const positionSchema = z.object({ x: z.number(), y: z.number() });

export type Position = z.infer<typeof positionSchema>;

export const SQLITE_COLUMN_TYPES = ["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"] as const;

export type ColumnType = (typeof SQLITE_COLUMN_TYPES)[number];

export const columnSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(SQLITE_COLUMN_TYPES),
  // Free-form and dialect-unenforced (SQLite ignores both); kept for
  // documentation and future dialects.
  size: z.string(),
  defaultValue: z.string(),
  nullable: z.boolean(),
  autoIncrement: z.boolean(),
  comment: z.string(),
});

export type Column = z.infer<typeof columnSchema>;

export const KEY_TYPES = ["PRIMARY_KEY", "UNIQUE", "INDEX"] as const;

export type KeyType = (typeof KEY_TYPES)[number];

export const keySchema = z.object({
  id: z.uuid(),
  type: z.enum(KEY_TYPES),
  columnIds: z.array(z.uuid()).min(1),
});

export type Key = z.infer<typeof keySchema>;

export const foreignKeySchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(),
  referencedTableId: z.uuid(),
  referencedColumnId: z.uuid(),
});

export type ForeignKey = z.infer<typeof foreignKeySchema>;

export const tableSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  comment: z.string(),
  position: positionSchema,
  columns: z.array(columnSchema),
  keys: z.array(keySchema),
  foreignKeys: z.array(foreignKeySchema),
});

export type Table = z.infer<typeof tableSchema>;

export const schemaSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  tables: z.array(tableSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Schema = z.infer<typeof schemaSchema>;

export type SchemaSummary = Pick<Schema, "id" | "name" | "updatedAt">;
