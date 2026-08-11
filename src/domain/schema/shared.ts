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

/** Strips only incoming references to `columnId` on `tableId` — unlike `removeForeignKeysInvolvingColumn`, leaves that column's own outgoing foreign key (if any) untouched. */
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
