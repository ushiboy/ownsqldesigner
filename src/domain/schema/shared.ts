import type { Column, Table } from "./types";

export function hasColumn(table: Table | undefined, columnId: string): table is Table {
  return table !== undefined && table.columns.some((column) => column.id === columnId);
}

export function withNormalizedAutoIncrement(table: Table): Table {
  const pkColumnId = solePrimaryKeyColumnId(table);
  return {
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      autoIncrement: column.autoIncrement && isEligibleForAutoIncrement(column, pkColumnId),
    })),
  };
}

export function removeForeignKeysReferencingTable(
  tables: Table[],
  removedTableId: string,
): Table[] {
  return tables.map((table) => ({
    ...table,
    foreignKeys: table.foreignKeys.filter((fk) => fk.referencedTableId !== removedTableId),
  }));
}

export function removeForeignKeysInvolvingColumn(tables: Table[], columnId: string): Table[] {
  return tables.map((table) => ({
    ...table,
    foreignKeys: table.foreignKeys.filter(
      (fk) => fk.columnId !== columnId && fk.referencedColumnId !== columnId,
    ),
  }));
}

function solePrimaryKeyColumnId(table: Table): string | undefined {
  const primaryKey = table.keys.find((key) => key.type === "PRIMARY_KEY");
  return primaryKey !== undefined && primaryKey.columnIds.length === 1
    ? primaryKey.columnIds[0]
    : undefined;
}

function isEligibleForAutoIncrement(column: Column, pkColumnId: string | undefined): boolean {
  return column.type === "INTEGER" && column.id === pkColumnId;
}
