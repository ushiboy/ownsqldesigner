import type { Table } from "./types";

export function hasColumn(table: Table | undefined, columnId: string): table is Table {
  return table !== undefined && table.columns.some((column) => column.id === columnId);
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
