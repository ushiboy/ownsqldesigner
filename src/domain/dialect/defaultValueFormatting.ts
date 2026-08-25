/** Matches a plain signed-decimal numeric literal; shared with PostgreSQL's `isDefaultValueValid` (0047). */
export const DEFAULT_VALUE_NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

// SQL-standard keywords (shared by SQLite and PostgreSQL) that a DEFAULT
// clause must emit unquoted to keep its intended meaning — quoting
// CURRENT_TIMESTAMP, for instance, turns it into the literal string
// "CURRENT_TIMESTAMP" instead of an expression evaluated at insert time.
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
