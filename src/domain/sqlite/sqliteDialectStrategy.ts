import { buildDialectStrategy, type DialectStrategy } from "../dialect/dialectStrategy";
import { isSqliteAutoIncrementEligible } from "./autoIncrement";
import { SQLITE_COLUMN_TYPES } from "./columnTypes";
import { generateSqliteDdl } from "./generateDdl";
import { isSqliteNameTaken } from "./nameComparison";
import { isSqliteReservedKeyword } from "./reservedKeywords";

export const sqliteDialectStrategy: DialectStrategy = buildDialectStrategy({
  columnTypes: SQLITE_COLUMN_TYPES,
  sizableColumnTypes: SQLITE_COLUMN_TYPES,
  precisionColumnTypes: [],
  autoIncrementEligibleColumnTypes: ["INTEGER"],
  allowsDefaultWithAutoIncrement: true,
  isAutoIncrementEligible: isSqliteAutoIncrementEligible,
  isSizeValid: () => true,
  isPrecisionValid: () => true,
  isNameTaken: isSqliteNameTaken,
  isReservedKeyword: isSqliteReservedKeyword,
  generateDdl: generateSqliteDdl,
});
