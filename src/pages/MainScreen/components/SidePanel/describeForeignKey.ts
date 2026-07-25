import type { Column, ForeignKey } from "../../../../domain/schema";

type ReferencedTable = {
  name: string;
  columns: Pick<Column, "id" | "name">[];
};

/** A foreign key has no name of its own, so the side panel renders a computed label instead. */
export function describeForeignKey(
  foreignKey: ForeignKey,
  ownColumns: Pick<Column, "id" | "name">[],
  referencedTable: ReferencedTable | undefined,
): string {
  const columnName = ownColumns.find((column) => column.id === foreignKey.columnId)?.name ?? "?";
  const referencedColumnName =
    referencedTable?.columns.find((column) => column.id === foreignKey.referencedColumnId)?.name ??
    "?";
  const referencedTableName = referencedTable?.name ?? "?";
  return `${columnName} → ${referencedTableName}.${referencedColumnName}`;
}
