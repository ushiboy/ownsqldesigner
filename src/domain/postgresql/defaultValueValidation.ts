import { DEFAULT_VALUE_NUMERIC_PATTERN } from "../dialect/defaultValueFormatting";
import { POSTGRESQL_NUMERIC_COLUMN_TYPES } from "./columnTypes";

const BOOLEAN_LITERAL_PATTERN = /^(true|false)$/i;

/** Whether `value` is a valid `defaultValue` literal for `type` under PostgreSQL (0047). */
export function isPostgresqlDefaultValueValid(type: string, value: string): boolean {
  if (value === "" || value.toUpperCase() === "NULL") {
    return true;
  }
  if (type === "BOOLEAN") {
    return BOOLEAN_LITERAL_PATTERN.test(value);
  }
  if ((POSTGRESQL_NUMERIC_COLUMN_TYPES as readonly string[]).includes(type)) {
    return DEFAULT_VALUE_NUMERIC_PATTERN.test(value);
  }
  return true;
}
