import { isReferenceableColumn } from "./key";
import type { Column, ForeignKey, Table } from "./types";

export function generateMermaidErDiagram(tables: Table[]): string {
  if (tables.length === 0) {
    return "";
  }
  const tablesById = new Map(tables.map((table) => [table.id, table]));
  const lines = [
    "erDiagram",
    ...tables.flatMap((table) => generateEntityBlock(table)),
    ...tables.flatMap((table) => generateRelationshipLines(table, tablesById)),
  ];
  return lines.join("\n");
}

function generateEntityBlock(table: Table): string[] {
  return [
    `  ${table.name} {`,
    ...table.columns.map((column) => `    ${generateAttributeLine(table, column)}`),
    "  }",
  ];
}

function generateAttributeLine(table: Table, column: Column): string {
  const type = column.type.replace(/\s+/g, "_");
  const keys = attributeKeys(table, column);
  const comment = attributeComment(column);
  return [type, column.name, keys.join(","), comment].filter((part) => part !== "").join(" ");
}

function attributeKeys(table: Table, column: Column): string[] {
  const keys: string[] = [];
  if (table.keys.some((key) => key.type === "PRIMARY_KEY" && key.columnIds.includes(column.id))) {
    keys.push("PK");
  }
  if (table.keys.some((key) => key.type === "UNIQUE" && key.columnIds.includes(column.id))) {
    keys.push("UK");
  }
  if (table.foreignKeys.some((foreignKey) => foreignKey.columnId === column.id)) {
    keys.push("FK");
  }
  return keys;
}

function attributeComment(column: Column): string {
  const parts = [
    column.size !== "" ? `size=${column.size}` : "",
    column.precision !== "" ? `precision=${column.precision}` : "",
    column.nullable ? "" : "not null",
    // Mermaid's attribute comment grammar doesn't support an escaped quote,
    // so a literal `"` in a free-text column comment would break parsing.
    column.comment.replaceAll('"', "'"),
  ].filter((part) => part !== "");
  return parts.length > 0 ? `"${parts.join(", ")}"` : "";
}

function generateRelationshipLines(table: Table, tablesById: Map<string, Table>): string[] {
  return table.foreignKeys.map((foreignKey) =>
    generateRelationshipLine(table, foreignKey, tablesById),
  );
}

function generateRelationshipLine(
  childTable: Table,
  foreignKey: ForeignKey,
  tablesById: Map<string, Table>,
): string {
  const parentTable = tablesById.get(foreignKey.referencedTableId);
  const parentName = parentTable?.name ?? foreignKey.referencedTableId;
  const childCardinality = isReferenceableColumn(childTable, foreignKey.columnId) ? "||" : "o{";
  const columnName = childTable.columns.find((column) => column.id === foreignKey.columnId)?.name;
  return `  ${parentName} ||--${childCardinality} ${childTable.name} : "${columnName ?? foreignKey.columnId}"`;
}
