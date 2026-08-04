import type { Column, Table } from "../schema/types";

/** Per-dialect behavior for the pieces of the domain that vary by SQL engine. */
export type DialectStrategy = {
  readonly columnTypes: readonly string[];
  normalizeAutoIncrement(table: Table): Table;
  isNameTaken(name: string, existingNames: string[]): boolean;
  hasDuplicateNames(names: string[]): boolean;
  generateDdl(tables: Table[]): string;
};

/** The atomic per-dialect rules a concrete dialect module supplies; the rest is generic. */
export type DialectStrategyConfig = {
  columnTypes: readonly string[];
  isAutoIncrementEligible(column: Column, pkColumnId: string | undefined): boolean;
  isNameTaken(name: string, existingNames: string[]): boolean;
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
    normalizeAutoIncrement: (table) =>
      normalizeAutoIncrement(table, config.isAutoIncrementEligible),
    isNameTaken: config.isNameTaken,
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
