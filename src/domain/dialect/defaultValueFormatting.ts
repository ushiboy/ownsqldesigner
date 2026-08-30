/** Matches a plain signed-decimal numeric literal; shared with PostgreSQL's `isDefaultValueValid` (0047). */
export const DEFAULT_VALUE_NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

// DEFAULT clause keywords that must stay unquoted (0043).
const DEFAULT_VALUE_KEYWORDS = new Set([
  "CURRENT_TIMESTAMP",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "NULL",
  "TRUE",
  "FALSE",
]);

/** Renders a column's raw `defaultValue` as a DDL literal or keyword (0043). */
export function formatDefaultValue(raw: string): string {
  if (DEFAULT_VALUE_NUMERIC_PATTERN.test(raw) || DEFAULT_VALUE_KEYWORDS.has(raw.toUpperCase())) {
    return raw;
  }
  return `'${raw.replace(/'/g, "''")}'`;
}
