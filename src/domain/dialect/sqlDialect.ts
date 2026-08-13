export const SQL_DIALECTS = ["sqlite", "postgresql"] as const;

export type SqlDialect = (typeof SQL_DIALECTS)[number];

export const DEFAULT_SQL_DIALECT: SqlDialect = "sqlite";
