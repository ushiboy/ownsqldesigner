import { getDialectStrategy, type DialectStrategy } from "../dialect";
import { hasColumn, removeForeignKeysInvolvingColumn } from "./shared";
import type { Column, Key, Schema, Table } from "./types";
import { isColumnNameAvailable } from "./validation";

type AddColumnOptions = {
  id?: string;
  now?: Date;
};

export function addColumn(
  schema: Schema,
  tableId: string,
  fields: Omit<Column, "id">,
  options: AddColumnOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  const strategy = getDialectStrategy(schema.dialect);
  if (!canAddColumn(targetTable, fields, strategy)) {
    return schema;
  }
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId ? { ...table, columns: [...table.columns, { id, ...fields }] } : table,
    ),
    updatedAt: now,
  };
}

type UpdateColumnOptions = {
  now?: Date;
};

export function updateColumn(
  schema: Schema,
  tableId: string,
  columnId: string,
  fields: Omit<Column, "id">,
  options: UpdateColumnOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  const strategy = getDialectStrategy(schema.dialect);
  if (!canUpdateColumn(targetTable, columnId, fields, strategy)) {
    return schema;
  }
  const { now = new Date() } = options;
  const originalType = targetTable?.columns.find((column) => column.id === columnId)?.type;
  const tables = schema.tables.map((table) =>
    table.id === tableId
      ? strategy.normalizeColumnForDialect({
          ...table,
          columns: table.columns.map((column) =>
            column.id === columnId ? { id: columnId, ...fields } : column,
          ),
        })
      : table,
  );
  return {
    ...schema,
    tables:
      originalType !== fields.type
        ? propagateColumnTypeChange(tables, columnId, fields.type, strategy)
        : tables,
    updatedAt: now,
  };
}

type RemoveColumnOptions = {
  now?: Date;
};

export function removeColumn(
  schema: Schema,
  tableId: string,
  columnId: string,
  options: RemoveColumnOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!hasColumn(targetTable, columnId)) {
    return schema;
  }
  const { now = new Date() } = options;
  const strategy = getDialectStrategy(schema.dialect);
  const tables = schema.tables.map((table) =>
    table.id === tableId
      ? strategy.normalizeColumnForDialect({
          ...table,
          columns: table.columns.filter((column) => column.id !== columnId),
          keys: removeColumnFromKeys(table.keys, columnId),
        })
      : table,
  );
  return {
    ...schema,
    tables: removeForeignKeysInvolvingColumn(tables, columnId),
    updatedAt: now,
  };
}

type MoveColumnOptions = {
  now?: Date;
};

export function moveColumnUp(
  schema: Schema,
  tableId: string,
  columnId: string,
  options: MoveColumnOptions = {},
): Schema {
  return moveColumn(schema, tableId, columnId, -1, options);
}

export function moveColumnDown(
  schema: Schema,
  tableId: string,
  columnId: string,
  options: MoveColumnOptions = {},
): Schema {
  return moveColumn(schema, tableId, columnId, 1, options);
}

export function formatColumnType(column: Pick<Column, "type" | "size">): string {
  return column.size === "" ? column.type : `${column.type}(${column.size})`;
}

/** Suffixes `baseName` with `_2`, `_3`, ... until it doesn't collide with an existing column. */
export function uniqueColumnName(
  table: Table,
  baseName: string,
  strategy: DialectStrategy,
): string {
  let candidate = baseName;
  let suffix = 2;
  while (!isColumnNameAvailable(table, candidate, strategy)) {
    candidate = `${baseName}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function moveColumn(
  schema: Schema,
  tableId: string,
  columnId: string,
  offset: -1 | 1,
  options: MoveColumnOptions,
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (targetTable === undefined) {
    return schema;
  }
  const index = targetTable.columns.findIndex((column) => column.id === columnId);
  const targetIndex = index + offset;
  if (index === -1 || targetIndex < 0 || targetIndex >= targetTable.columns.length) {
    return schema;
  }
  const columns = [...targetTable.columns];
  [columns[index], columns[targetIndex]] = [columns[targetIndex], columns[index]];
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => (table.id === tableId ? { ...table, columns } : table)),
    updatedAt: now,
  };
}

function canAddColumn(
  table: Table | undefined,
  fields: Omit<Column, "id">,
  strategy: DialectStrategy,
): boolean {
  return table !== undefined && isColumnNameAvailable(table, fields.name, strategy);
}

function canUpdateColumn(
  table: Table | undefined,
  columnId: string,
  fields: Omit<Column, "id">,
  strategy: DialectStrategy,
): boolean {
  return (
    hasColumn(table, columnId) && isColumnNameAvailable(table, fields.name, strategy, columnId)
  );
}

function removeColumnFromKeys(keys: Key[], columnId: string): Key[] {
  return keys
    .map((key) => ({ ...key, columnIds: key.columnIds.filter((id) => id !== columnId) }))
    .filter((key) => key.columnIds.length > 0);
}

/**
 * Cascades a type change (REQ-017) to every FK child column reachable from
 * `columnId`, transitively through further FK chains. A column is only
 * enqueued once its type actually flips to `type`, so a column already at
 * `type` is never reprocessed — this doubles as cycle protection without a
 * separate visited-set.
 */
function propagateColumnTypeChange(
  tables: Table[],
  columnId: string,
  type: string,
  strategy: DialectStrategy,
): Table[] {
  let result = tables;
  const queue = [columnId];
  while (queue.length > 0) {
    const currentColumnId = queue.shift() as string;
    const changedChildColumnIds: string[] = [];
    result = result.map((table) => {
      const childColumnIds = new Set(
        table.foreignKeys
          .filter((fk) => fk.referencedColumnId === currentColumnId)
          .map((fk) => fk.columnId),
      );
      if (childColumnIds.size === 0) {
        return table;
      }
      let changed = false;
      const columns = table.columns.map((column) => {
        if (childColumnIds.has(column.id) && column.type !== type) {
          changed = true;
          changedChildColumnIds.push(column.id);
          return { ...column, type };
        }
        return column;
      });
      return changed ? strategy.normalizeColumnForDialect({ ...table, columns }) : table;
    });
    queue.push(...changedChildColumnIds);
  }
  return result;
}
