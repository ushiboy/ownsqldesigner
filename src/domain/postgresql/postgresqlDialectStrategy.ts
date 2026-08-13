import { buildDialectStrategy, type DialectStrategy } from "../dialect/dialectStrategy";
import { isPostgresqlAutoIncrementEligible } from "./autoIncrement";
import { POSTGRESQL_COLUMN_TYPES } from "./columnTypes";
import { generatePostgresqlDdl } from "./generateDdl";
import { isPostgresqlNameTaken } from "./nameComparison";
import { isPostgresqlReservedKeyword } from "./reservedKeywords";

export const postgresqlDialectStrategy: DialectStrategy = buildDialectStrategy({
  columnTypes: POSTGRESQL_COLUMN_TYPES,
  isAutoIncrementEligible: isPostgresqlAutoIncrementEligible,
  isNameTaken: isPostgresqlNameTaken,
  isReservedKeyword: isPostgresqlReservedKeyword,
  generateDdl: generatePostgresqlDdl,
});
