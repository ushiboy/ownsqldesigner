export const SQL_DIALECTS = ["sqlite"] as const;

export type SqlDialect = (typeof SQL_DIALECTS)[number];

export const DEFAULT_SQL_DIALECT: SqlDialect = "sqlite";
