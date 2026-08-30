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
  "BYTEA",
] as const;

export const POSTGRESQL_SIZABLE_COLUMN_TYPES = ["VARCHAR", "CHAR", "NUMERIC"] as const;

export const POSTGRESQL_PRECISION_COLUMN_TYPES = ["TIME", "TIMESTAMP"] as const;

/** The subset of `POSTGRESQL_COLUMN_TYPES` whose `defaultValue` must be a numeric literal (0047). */
export const POSTGRESQL_NUMERIC_COLUMN_TYPES = [
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "NUMERIC",
  "REAL",
  "DOUBLE PRECISION",
] as const;
