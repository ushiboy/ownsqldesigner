import { getDialectStrategy } from "../dialect";
import { isReferenceableColumn } from "./key";
import { schemaSchema, type ForeignKey, type Schema, type Table } from "./types";
import { isValidIdentifierName } from "./validation";

/** Whether `schema` satisfies every incrementally-enforced invariant (REQ-018/019/020/021/022) at once. */
export function isSchemaIntegrityValid(schema: Schema): boolean {
  const tableNames = schema.tables.map((table) => table.name);
  return (
    !getDialectStrategy(schema.dialect).hasDuplicateNames(tableNames) &&
    schema.tables.every(
      (table) => isValidIdentifierName(table.name) && isTableIntegrityValid(schema, table),
    )
  );
}

/** Parses an untrusted file's contents into a `Schema`, or `null` on any parse/shape/integrity failure. */
export function parseSchemaFile(raw: string): Schema | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schemaSchema.safeParse(json);
  if (!result.success || !isSchemaIntegrityValid(result.data)) {
    return null;
  }
  return result.data;
}

type ImportSchemaOptions = {
  id?: string;
  now?: Date;
};

/** Gives an externally-sourced `Schema` a fresh identity so it cannot collide with a saved one (REQ-027). */
export function importSchema(schema: Schema, options: ImportSchemaOptions = {}): Schema {
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return { ...schema, id, createdAt: now, updatedAt: now };
}

function isTableIntegrityValid(schema: Schema, table: Table): boolean {
  const columnIds = new Set(table.columns.map((column) => column.id));
  const columnNames = table.columns.map((column) => column.name);
  const strategy = getDialectStrategy(schema.dialect);
  return (
    !strategy.hasDuplicateNames(columnNames) &&
    table.columns.every(
      (column) => isValidIdentifierName(column.name) && strategy.columnTypes.includes(column.type),
    ) &&
    table.keys.filter((key) => key.type === "PRIMARY_KEY").length <= 1 &&
    table.keys.every((key) => key.columnIds.every((id) => columnIds.has(id))) &&
    table.foreignKeys.every((fk) => isForeignKeyIntegrityValid(schema, table, fk))
  );
}

function isForeignKeyIntegrityValid(schema: Schema, table: Table, fk: ForeignKey): boolean {
  if (!table.columns.some((column) => column.id === fk.columnId)) {
    return false;
  }
  const referencedTable = schema.tables.find((t) => t.id === fk.referencedTableId);
  return (
    referencedTable !== undefined && isReferenceableColumn(referencedTable, fk.referencedColumnId)
  );
}
