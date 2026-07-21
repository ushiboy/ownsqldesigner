import { z } from "zod";

export const DEFAULT_SCHEMA_NAME = "New Schema";

const GRID_COLUMNS = 4;
const GRID_CELL_WIDTH = 260;
const GRID_CELL_HEIGHT = 160;

const positionSchema = z.object({ x: z.number(), y: z.number() });

export type Position = z.infer<typeof positionSchema>;

export const tableSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  comment: z.string(),
  position: positionSchema,
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

type CreateSchemaOptions = {
  id?: string;
  now?: Date;
};

export function createSchema(name: string, options: CreateSchemaOptions = {}): Schema {
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    id,
    name,
    tables: [],
    createdAt: now,
    updatedAt: now,
  };
}

type RenameSchemaOptions = {
  now?: Date;
};

export function renameSchema(
  schema: Schema,
  name: string,
  options: RenameSchemaOptions = {},
): Schema {
  const { now = new Date() } = options;
  return {
    ...schema,
    name,
    updatedAt: now,
  };
}

type CreateTableOptions = {
  id?: string;
  now?: Date;
};

export function createTable(
  schema: Schema,
  name: string,
  options: CreateTableOptions = {},
): Schema {
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    ...schema,
    tables: [
      ...schema.tables,
      { id, name, comment: "", position: defaultTablePosition(schema.tables.length) },
    ],
    updatedAt: now,
  };
}

type RenameTableOptions = {
  now?: Date;
};

export function renameTable(
  schema: Schema,
  tableId: string,
  name: string,
  options: RenameTableOptions = {},
): Schema {
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => (table.id === tableId ? { ...table, name } : table)),
    updatedAt: now,
  };
}

type UpdateTableCommentOptions = {
  now?: Date;
};

export function updateTableComment(
  schema: Schema,
  tableId: string,
  comment: string,
  options: UpdateTableCommentOptions = {},
): Schema {
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => (table.id === tableId ? { ...table, comment } : table)),
    updatedAt: now,
  };
}

type MoveTableOptions = {
  now?: Date;
};

export function moveTable(
  schema: Schema,
  tableId: string,
  position: Position,
  options: MoveTableOptions = {},
): Schema {
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => (table.id === tableId ? { ...table, position } : table)),
    updatedAt: now,
  };
}

function defaultTablePosition(index: number): Position {
  return {
    x: (index % GRID_COLUMNS) * GRID_CELL_WIDTH,
    y: Math.floor(index / GRID_COLUMNS) * GRID_CELL_HEIGHT,
  };
}
