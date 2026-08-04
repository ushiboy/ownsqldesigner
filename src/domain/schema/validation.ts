import { getDialectStrategy, type DialectStrategy } from "../dialect";
import type { Schema, Table } from "./types";

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Whether `name` matches the unquoted-SQL-identifier shape required by REQ-019. */
export function isValidIdentifierName(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

/** Whether `name` is a valid identifier not already used by another table in `schema` (REQ-018/019). */
export function isTableNameAvailable(
  schema: Schema,
  name: string,
  excludeTableId?: string,
): boolean {
  const strategy = getDialectStrategy(schema.dialect);
  return (
    isValidIdentifierName(name) &&
    !strategy.isNameTaken(
      name,
      schema.tables.filter((table) => table.id !== excludeTableId).map((table) => table.name),
    )
  );
}

/** Whether `name` is a valid identifier not already used by another column on `table` (REQ-018/019). */
export function isColumnNameAvailable(
  table: Table,
  name: string,
  strategy: DialectStrategy,
  excludeColumnId?: string,
): boolean {
  return (
    isValidIdentifierName(name) &&
    !strategy.isNameTaken(
      name,
      table.columns.filter((column) => column.id !== excludeColumnId).map((column) => column.name),
    )
  );
}

export type NameValidity = {
  isEmpty: boolean;
  isInvalidShape: boolean;
  isDuplicate: boolean;
  isInvalid: boolean;
};

/** Live (REQ-023) validity of a name field being typed in a form, against sibling names (REQ-018/019). */
export function describeNameValidity(
  trimmedName: string,
  existingNames: string[],
  strategy: DialectStrategy,
): NameValidity {
  const isEmpty = trimmedName === "";
  const isInvalidShape = !isEmpty && !isValidIdentifierName(trimmedName);
  const isDuplicate =
    !isEmpty && !isInvalidShape && strategy.isNameTaken(trimmedName, existingNames);
  return {
    isEmpty,
    isInvalidShape,
    isDuplicate,
    isInvalid: isEmpty || isInvalidShape || isDuplicate,
  };
}
