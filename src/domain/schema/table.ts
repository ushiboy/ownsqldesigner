import { removeForeignKeysReferencingTable } from "./shared";
import type { Position, Schema } from "./types";
import { isTableNameAvailable } from "./validation";

const GRID_COLUMNS = 4;
const GRID_CELL_WIDTH = 260;
const GRID_CELL_HEIGHT = 160;

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

// Used by undo/redo: `snapshot` is a prior version of `current`'s content.
// The document's own identity (id/name/createdAt) tracks `current`, not the
// snapshot, so that undoing past a rename doesn't also revert the name, and
// storage sees a restore as a fresh edit rather than a jump back in time.
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
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  const remaining = schema.tables.filter((table) => table.id !== tableId);
  return {
    ...schema,
    tables: removeForeignKeysReferencingTable(remaining, tableId),
    updatedAt: now,
  };
}

function defaultTablePosition(index: number): Position {
  return {
    x: (index % GRID_COLUMNS) * GRID_CELL_WIDTH,
    y: Math.floor(index / GRID_COLUMNS) * GRID_CELL_HEIGHT,
  };
}
