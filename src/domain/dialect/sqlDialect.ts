export const SQL_DIALECTS = ["sqlite", "postgresql"] as const;

export type SqlDialect = (typeof SQL_DIALECTS)[number];

export const DEFAULT_SQL_DIALECT: SqlDialect = "sqlite";

/** Display names, not translated: these are product proper nouns, not UI copy. */
export const SQL_DIALECT_LABELS: Record<SqlDialect, string> = {
  sqlite: "SQLite",
  postgresql: "PostgreSQL",
};
