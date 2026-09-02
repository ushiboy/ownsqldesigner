import {
  addColumn,
  addForeignKey,
  addKey,
  createTable,
  updateColumn,
  type Column,
  type ForeignKey,
  type Key,
  type Schema,
  type Table,
} from "../../src/domain/schema";

// `createTable`/`addColumn`/`addKey`/`addForeignKey`/`updateColumn` silently
// no-op (return the schema unchanged) on invalid input — e.g. a duplicate
// name — rather than throwing (src/domain/schema/{table,column,key,
// foreignKey}.ts). A typo in a fixture here could otherwise shrink the
// schema being verified without `pnpm verify:sql` ever failing. These
// wrappers turn that silent no-op into a thrown error at the call site.

function findTable(schema: Schema, tableId: string): Table {
  const table = schema.tables.find((t) => t.id === tableId);
  if (table === undefined) {
    throw new Error(`sql-verify fixture: expected a table with id ${tableId}`);
  }
  return table;
}

export function mustCreateTable(
  schema: Schema,
  name: string,
  options?: Parameters<typeof createTable>[2],
): Schema {
  const next = createTable(schema, name, options);
  if (next.tables.length !== schema.tables.length + 1) {
    throw new Error(`sql-verify fixture: createTable("${name}") was a no-op`);
  }
  return next;
}

export function mustAddColumn(
  schema: Schema,
  tableId: string,
  fields: Omit<Column, "id">,
  options?: Parameters<typeof addColumn>[3],
): Schema {
  const before = findTable(schema, tableId).columns.length;
  const next = addColumn(schema, tableId, fields, options);
  if (findTable(next, tableId).columns.length !== before + 1) {
    throw new Error(`sql-verify fixture: addColumn("${fields.name}") was a no-op`);
  }
  return next;
}

export function mustAddKey(
  schema: Schema,
  tableId: string,
  fields: Omit<Key, "id">,
  options?: Parameters<typeof addKey>[3],
): Schema {
  const before = findTable(schema, tableId).keys.length;
  const next = addKey(schema, tableId, fields, options);
  if (findTable(next, tableId).keys.length !== before + 1) {
    throw new Error(`sql-verify fixture: addKey(${fields.type}) was a no-op`);
  }
  return next;
}

export function mustAddForeignKey(
  schema: Schema,
  tableId: string,
  fields: Omit<ForeignKey, "id">,
  options?: Parameters<typeof addForeignKey>[3],
): Schema {
  const before = findTable(schema, tableId).foreignKeys.length;
  const next = addForeignKey(schema, tableId, fields, options);
  if (findTable(next, tableId).foreignKeys.length !== before + 1) {
    throw new Error(`sql-verify fixture: addForeignKey on table ${tableId} was a no-op`);
  }
  return next;
}

/**
 * `updateColumn` can no-op (invalid target) or normalize away fields the
 * caller expected to survive (e.g. `autoIncrement` before its PRIMARY KEY
 * exists) — `check` asserts the column ended up in the intended shape.
 */
export function mustUpdateColumn(
  schema: Schema,
  tableId: string,
  columnId: string,
  fields: Omit<Column, "id">,
  check: (column: Column) => boolean,
  options?: Parameters<typeof updateColumn>[4],
): Schema {
  const next = updateColumn(schema, tableId, columnId, fields, options);
  const column = findTable(next, tableId).columns.find((c) => c.id === columnId);
  if (column === undefined || !check(column)) {
    throw new Error(`sql-verify fixture: updateColumn("${fields.name}") did not apply as expected`);
  }
  return next;
}
