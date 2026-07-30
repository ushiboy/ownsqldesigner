import type { Schema, Table } from "./types";

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Whether `name` matches the unquoted-SQL-identifier shape required by REQ-019. */
export function isValidIdentifierName(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

/** Case-insensitive membership check, matching SQLite's own identifier comparison. */
export function isNameTaken(name: string, existingNames: string[]): boolean {
  const normalized = name.toLowerCase();
  return existingNames.some((existing) => existing.toLowerCase() === normalized);
}

/** Whether `name` is a valid identifier not already used by another table in `schema` (REQ-018/019). */
export function isTableNameAvailable(
  schema: Schema,
  name: string,
  excludeTableId?: string,
): boolean {
  return (
    isValidIdentifierName(name) &&
    !isNameTaken(
      name,
      schema.tables.filter((table) => table.id !== excludeTableId).map((table) => table.name),
    )
  );
}

/** Whether `name` is a valid identifier not already used by another column on `table` (REQ-018/019). */
export function isColumnNameAvailable(
  table: Table,
  name: string,
  excludeColumnId?: string,
): boolean {
  return (
    isValidIdentifierName(name) &&
    !isNameTaken(
      name,
      table.columns.filter((column) => column.id !== excludeColumnId).map((column) => column.name),
    )
  );
}
