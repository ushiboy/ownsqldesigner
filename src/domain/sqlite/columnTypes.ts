export const SQLITE_COLUMN_TYPES = ["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"] as const;

/** The subset of `SQLITE_COLUMN_TYPES` that accepts a size/length modifier. */
export const SQLITE_SIZABLE_COLUMN_TYPES = ["INTEGER", "TEXT", "REAL", "NUMERIC"] as const;
