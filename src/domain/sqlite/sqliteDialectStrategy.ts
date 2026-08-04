import { buildDialectStrategy, type DialectStrategy } from "../dialect/dialectStrategy";
import { isSqliteAutoIncrementEligible } from "./autoIncrement";
import { SQLITE_COLUMN_TYPES } from "./columnTypes";
import { generateSqliteDdl } from "./generateDdl";
import { isSqliteNameTaken } from "./nameComparison";

export const sqliteDialectStrategy: DialectStrategy = buildDialectStrategy({
  columnTypes: SQLITE_COLUMN_TYPES,
  isAutoIncrementEligible: isSqliteAutoIncrementEligible,
  isNameTaken: isSqliteNameTaken,
  generateDdl: generateSqliteDdl,
});
