import { sqliteDialectStrategy } from "../sqlite/sqliteDialectStrategy";
import type { DialectStrategy } from "./dialectStrategy";
import type { SqlDialect } from "./sqlDialect";

const STRATEGIES: Record<SqlDialect, DialectStrategy> = {
  sqlite: sqliteDialectStrategy,
};

export function getDialectStrategy(dialect: SqlDialect): DialectStrategy {
  return STRATEGIES[dialect];
}
