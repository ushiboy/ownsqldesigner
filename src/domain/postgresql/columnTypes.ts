export const POSTGRESQL_COLUMN_TYPES = [
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "NUMERIC",
  "REAL",
  "DOUBLE PRECISION",
  "BOOLEAN",
  "VARCHAR",
  "CHAR",
  "TEXT",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "UUID",
  "JSONB",
] as const;

/** The subset of `POSTGRESQL_COLUMN_TYPES` that accepts a size/precision modifier. */
export const POSTGRESQL_SIZABLE_COLUMN_TYPES = ["VARCHAR", "CHAR", "NUMERIC"] as const;
