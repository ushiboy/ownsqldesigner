import { DEFAULT_SQL_DIALECT, type SqlDialect } from "../dialect/sqlDialect";
import { removeForeignKeysReferencingTables } from "./shared";
import type { Position, Schema } from "./types";
import { isTableNameAvailable } from "./validation";

const GRID_COLUMNS = 4;
// Exported for reuse as the fallback table-node footprint estimate when
// auto-aligning a table that hasn't been measured by the canvas yet
// (see autoAlignLayout.ts) — the same "typical table node size" concept,
// not a second, independent magic number.
export const GRID_CELL_WIDTH = 260;
export const GRID_CELL_HEIGHT = 160;

type CreateSchemaOptions = {
  id?: string;
  now?: Date;
  dialect?: SqlDialect;
};

export function createSchema(name: string, options: CreateSchemaOptions = {}): Schema {
  const { id = crypto.randomUUID(), now = new Date(), dialect = DEFAULT_SQL_DIALECT } = options;
  return {
    id,
    name,
    dialect,
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
  if (!isTableNameAvailable(schema, name)) {
    return schema;
  }
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    ...schema,
    tables: [
      ...schema.tables,
      {
        id,
        name,
        comment: "",
        position: defaultTablePosition(schema.tables.length),
        columns: [],
        keys: [],
        foreignKeys: [],
      },
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
  if (!isTableNameAvailable(schema, name, tableId)) {
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

type MoveTablesOptions = {
  now?: Date;
};

export function moveTables(
  schema: Schema,
  moves: readonly { tableId: string; position: Position }[],
  options: MoveTablesOptions = {},
): Schema {
  const positionByTableId = new Map(moves.map((move) => [move.tableId, move.position]));
  if (!schema.tables.some((table) => positionByTableId.has(table.id))) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => {
      const position = positionByTableId.get(table.id);
      return position === undefined ? table : { ...table, position };
    }),
    updatedAt: now,
  };
}

type RestoreSchemaOptions = {
  now?: Date;
};

export function restoreSchema(
  current: Schema,
  snapshot: Schema,
  options: RestoreSchemaOptions = {},
): Schema {
  const { now = new Date() } = options;
  return {
    ...snapshot,
    id: current.id,
    name: current.name,
    createdAt: current.createdAt,
    updatedAt: now,
  };
}

type RemoveTableOptions = {
  now?: Date;
};

export function removeTable(
  schema: Schema,
  tableId: string,
  options: RemoveTableOptions = {},
): Schema {
  return removeTables(schema, [tableId], options);
}

type RemoveTablesOptions = {
  now?: Date;
};

export function removeTables(
  schema: Schema,
  tableIds: readonly string[],
  options: RemoveTablesOptions = {},
): Schema {
  const removedIds = new Set(tableIds);
  const remaining = schema.tables.filter((table) => !removedIds.has(table.id));
  if (remaining.length === schema.tables.length) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: removeForeignKeysReferencingTables(remaining, removedIds),
    updatedAt: now,
  };
}

function defaultTablePosition(index: number): Position {
  return {
    x: (index % GRID_COLUMNS) * GRID_CELL_WIDTH,
    y: Math.floor(index / GRID_COLUMNS) * GRID_CELL_HEIGHT,
  };
}
