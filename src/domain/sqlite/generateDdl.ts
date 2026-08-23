import { formatDefaultValue } from "../dialect/defaultValueFormatting";
import { columnNamesFor, generateDdl } from "../dialect/generateDdl";
import type { Column, Table } from "../schema/types";

export function generateSqliteDdl(tables: Table[]): string {
  return generateDdl(tables, { generateColumnDefinition, generatePrimaryKeyConstraint });
}

// Duplicates schema/column.ts's formatColumnType rather than importing it:
// this module is reached from getDialectStrategy, so a runtime import back
// into schema/column.ts (which itself calls getDialectStrategy) would be
// circular. Only type-only imports from schema/types are safe here.
function generateColumnDefinition(column: Column): string {
  const modifier = column.size !== "" ? column.size : column.precision;
  const type = modifier === "" ? column.type : `${column.type}(${modifier})`;
  const parts = [column.name, type];
  if (column.autoIncrement) {
    parts.push("PRIMARY KEY AUTOINCREMENT");
  }
  if (!column.nullable) {
    parts.push("NOT NULL");
  }
  if (column.defaultValue !== "") {
    parts.push(`DEFAULT ${formatDefaultValue(column.defaultValue)}`);
  }
  return parts.join(" ");
}

function generatePrimaryKeyConstraint(table: Table): string[] {
  // AUTOINCREMENT is rendered inline on the column instead (see
  // generateColumnDefinition); REQ-033's normalizeColumnForDialect invariant
  // guarantees it only ever applies to a sole INTEGER PK column.
  if (table.columns.some((column) => column.autoIncrement)) {
    return [];
  }
  const primaryKey = table.keys.find((key) => key.type === "PRIMARY_KEY");
  if (primaryKey === undefined) {
    return [];
  }
  return [`PRIMARY KEY (${columnNamesFor(table, primaryKey.columnIds).join(", ")})`];
}
