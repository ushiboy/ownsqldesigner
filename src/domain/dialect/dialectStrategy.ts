import type { Column, Table } from "../schema/types";

/** Per-dialect behavior for the pieces of the domain that vary by SQL engine. */
export type DialectStrategy = {
  readonly columnTypes: readonly string[];
  /** Column types that accept a size/precision modifier (e.g. `VARCHAR(255)`). */
  readonly sizableColumnTypes: readonly string[];
  /** Column types an auto-increment column may have (e.g. `INTEGER`, `BIGINT`). */
  readonly autoIncrementEligibleColumnTypes: readonly string[];
  /** Whether an auto-increment column may also declare an explicit default value. */
  readonly allowsDefaultWithAutoIncrement: boolean;
  isAutoIncrementEligible(column: Column, pkColumnId: string | undefined): boolean;
  normalizeAutoIncrement(table: Table): Table;
  isNameTaken(name: string, existingNames: string[]): boolean;
  isReservedKeyword(name: string): boolean;
  hasDuplicateNames(names: string[]): boolean;
  generateDdl(tables: Table[]): string;
};

/** The atomic per-dialect rules a concrete dialect module supplies; the rest is generic. */
export type DialectStrategyConfig = {
  columnTypes: readonly string[];
  sizableColumnTypes: readonly string[];
  autoIncrementEligibleColumnTypes: readonly string[];
  allowsDefaultWithAutoIncrement: boolean;
  isAutoIncrementEligible(column: Column, pkColumnId: string | undefined): boolean;
  isNameTaken(name: string, existingNames: string[]): boolean;
  isReservedKeyword(name: string): boolean;
  generateDdl(tables: Table[]): string;
};

/**
 * Derives the full `DialectStrategy` from a dialect's atomic rules, so each
 * dialect module only supplies a predicate/comparator, not the generic
 * table-normalization or duplicate-scan algorithms that wrap them.
 */
export function buildDialectStrategy(config: DialectStrategyConfig): DialectStrategy {
  return {
    columnTypes: config.columnTypes,
    sizableColumnTypes: config.sizableColumnTypes,
    autoIncrementEligibleColumnTypes: config.autoIncrementEligibleColumnTypes,
    allowsDefaultWithAutoIncrement: config.allowsDefaultWithAutoIncrement,
    isAutoIncrementEligible: config.isAutoIncrementEligible,
    normalizeAutoIncrement: (table) =>
      normalizeAutoIncrement(table, config.isAutoIncrementEligible),
    isNameTaken: config.isNameTaken,
    isReservedKeyword: config.isReservedKeyword,
    hasDuplicateNames: (names) => hasDuplicateNames(names, config.isNameTaken),
    generateDdl: config.generateDdl,
  };
}

function normalizeAutoIncrement(
  table: Table,
  isEligible: (column: Column, pkColumnId: string | undefined) => boolean,
): Table {
  const pkColumnId = solePrimaryKeyColumnId(table);
  return {
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      autoIncrement: column.autoIncrement && isEligible(column, pkColumnId),
    })),
  };
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
