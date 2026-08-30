import type { Table } from "./types";

export function hasColumn(table: Table | undefined, columnId: string): table is Table {
  return table !== undefined && table.columns.some((column) => column.id === columnId);
}

export function removeForeignKeysReferencingTables(
  tables: Table[],
  removedTableIds: ReadonlySet<string>,
): Table[] {
  return tables.map((table) => ({
    ...table,
    foreignKeys: table.foreignKeys.filter((fk) => !removedTableIds.has(fk.referencedTableId)),
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

export function removeForeignKeysReferencingColumn(
  tables: Table[],
  tableId: string,
  columnId: string,
): Table[] {
  return tables.map((table) => ({
    ...table,
    foreignKeys: table.foreignKeys.filter(
      (fk) => !(fk.referencedTableId === tableId && fk.referencedColumnId === columnId),
    ),
  }));
}
