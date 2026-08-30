import type { Column, Table } from "../schema/types";

export type DialectStrategy = {
  readonly columnTypes: readonly string[];
  readonly sizableColumnTypes: readonly string[];
  readonly precisionColumnTypes: readonly string[];
  readonly autoIncrementEligibleColumnTypes: readonly string[];
  readonly allowsDefaultWithAutoIncrement: boolean;
  isAutoIncrementEligible(column: Column, pkColumnId: string | undefined): boolean;
  /** Whether `value` is a valid `size` modifier for a column of `type` (0039). */
  isSizeValid(type: string, value: string): boolean;
  /** Whether `value` is a valid `precision` modifier for a column of `type` (0039). */
  isPrecisionValid(type: string, value: string): boolean;
  /** Whether `value` is a valid `defaultValue` literal for a column of `type` (0047). */
  isDefaultValueValid(type: string, value: string): boolean;
  normalizeColumnForDialect(table: Table): Table;
  isNameTaken(name: string, existingNames: string[]): boolean;
  isReservedKeyword(name: string): boolean;
  hasDuplicateNames(names: string[]): boolean;
  generateDdl(tables: Table[]): string;
};

export type DialectStrategyConfig = {
  columnTypes: readonly string[];
  sizableColumnTypes: readonly string[];
  precisionColumnTypes: readonly string[];
  autoIncrementEligibleColumnTypes: readonly string[];
  allowsDefaultWithAutoIncrement: boolean;
  isAutoIncrementEligible(column: Column, pkColumnId: string | undefined): boolean;
  isSizeValid(type: string, value: string): boolean;
  isPrecisionValid(type: string, value: string): boolean;
  isDefaultValueValid(type: string, value: string): boolean;
  isNameTaken(name: string, existingNames: string[]): boolean;
  isReservedKeyword(name: string): boolean;
  generateDdl(tables: Table[]): string;
};

// Derives the full `DialectStrategy` from a dialect's atomic rules (0026).
export function buildDialectStrategy(config: DialectStrategyConfig): DialectStrategy {
  return {
    columnTypes: config.columnTypes,
    sizableColumnTypes: config.sizableColumnTypes,
    precisionColumnTypes: config.precisionColumnTypes,
    autoIncrementEligibleColumnTypes: config.autoIncrementEligibleColumnTypes,
    allowsDefaultWithAutoIncrement: config.allowsDefaultWithAutoIncrement,
    isAutoIncrementEligible: config.isAutoIncrementEligible,
    isSizeValid: config.isSizeValid,
    isPrecisionValid: config.isPrecisionValid,
    isDefaultValueValid: config.isDefaultValueValid,
    normalizeColumnForDialect: (table) => normalizeColumnForDialect(table, config),
    isNameTaken: config.isNameTaken,
    isReservedKeyword: config.isReservedKeyword,
    hasDuplicateNames: (names) => hasDuplicateNames(names, config.isNameTaken),
    generateDdl: config.generateDdl,
  };
}

function normalizeColumnForDialect(table: Table, config: DialectStrategyConfig): Table {
  const pkColumnId = solePrimaryKeyColumnId(table);
  return {
    ...table,
    columns: table.columns.map((column) => {
      const autoIncrement =
        column.autoIncrement && config.isAutoIncrementEligible(column, pkColumnId);
      return {
        ...column,
        autoIncrement,
        size:
          config.sizableColumnTypes.includes(column.type) &&
          config.isSizeValid(column.type, column.size)
            ? column.size
            : "",
        precision:
          config.precisionColumnTypes.includes(column.type) &&
          config.isPrecisionValid(column.type, column.precision)
            ? column.precision
            : "",
        defaultValue: keepsDefaultValue(column, autoIncrement, config) ? column.defaultValue : "",
      };
    }),
  };
}

function keepsDefaultValue(
  column: Column,
  autoIncrement: boolean,
  config: DialectStrategyConfig,
): boolean {
  return (
    (!autoIncrement || config.allowsDefaultWithAutoIncrement) &&
    config.isDefaultValueValid(column.type, column.defaultValue)
  );
}

function solePrimaryKeyColumnId(table: Table): string | undefined {
  const primaryKey = table.keys.find((key) => key.type === "PRIMARY_KEY");
  return primaryKey !== undefined && primaryKey.columnIds.length === 1
    ? primaryKey.columnIds[0]
    : undefined;
}

function hasDuplicateNames(
  names: string[],
  isNameTaken: (name: string, existingNames: string[]) => boolean,
): boolean {
  return names.some((name, index) => isNameTaken(name, names.slice(0, index)));
}
