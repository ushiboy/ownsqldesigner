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

/** The subset of `POSTGRESQL_COLUMN_TYPES` that accepts a size/length modifier. */
export const POSTGRESQL_SIZABLE_COLUMN_TYPES = ["VARCHAR", "CHAR", "NUMERIC"] as const;

/** The subset of `POSTGRESQL_COLUMN_TYPES` that accepts a fractional-seconds precision modifier. */
export const POSTGRESQL_PRECISION_COLUMN_TYPES = ["TIME", "TIMESTAMP"] as const;
