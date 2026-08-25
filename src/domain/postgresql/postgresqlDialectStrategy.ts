import { buildDialectStrategy, type DialectStrategy } from "../dialect/dialectStrategy";
import { isPostgresqlAutoIncrementEligible } from "./autoIncrement";
import {
  POSTGRESQL_COLUMN_TYPES,
  POSTGRESQL_PRECISION_COLUMN_TYPES,
  POSTGRESQL_SIZABLE_COLUMN_TYPES,
} from "./columnTypes";
import { isPostgresqlDefaultValueValid } from "./defaultValueValidation";
import { generatePostgresqlDdl } from "./generateDdl";
import { isPostgresqlNameTaken } from "./nameComparison";
import { isPostgresqlReservedKeyword } from "./reservedKeywords";
import { isPostgresqlPrecisionValid, isPostgresqlSizeValid } from "./sizeAndPrecisionValidation";

export const postgresqlDialectStrategy: DialectStrategy = buildDialectStrategy({
  columnTypes: POSTGRESQL_COLUMN_TYPES,
  sizableColumnTypes: POSTGRESQL_SIZABLE_COLUMN_TYPES,
  precisionColumnTypes: POSTGRESQL_PRECISION_COLUMN_TYPES,
  autoIncrementEligibleColumnTypes: ["SMALLINT", "INTEGER", "BIGINT"],
  allowsDefaultWithAutoIncrement: false,
  isAutoIncrementEligible: isPostgresqlAutoIncrementEligible,
  isSizeValid: isPostgresqlSizeValid,
  isPrecisionValid: isPostgresqlPrecisionValid,
  isDefaultValueValid: isPostgresqlDefaultValueValid,
  isNameTaken: isPostgresqlNameTaken,
  isReservedKeyword: isPostgresqlReservedKeyword,
  generateDdl: generatePostgresqlDdl,
});
