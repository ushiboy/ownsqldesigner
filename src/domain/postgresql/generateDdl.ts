import { formatDefaultValue } from "../dialect/defaultValueFormatting";
import { columnNamesFor, generateDdl } from "../dialect/generateDdl";
import type { Column, Table } from "../schema/types";

export function generatePostgresqlDdl(tables: Table[]): string {
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
    parts.push("GENERATED ALWAYS AS IDENTITY");
  }
  if (!column.nullable) {
    parts.push("NOT NULL");
  }
  // A GENERATED ALWAYS AS IDENTITY column cannot also carry an explicit
  // DEFAULT clause — PostgreSQL rejects the combination as a syntax error.
  if (column.defaultValue !== "" && !column.autoIncrement) {
    parts.push(`DEFAULT ${formatDefaultValue(column.defaultValue)}`);
  }
  return parts.join(" ");
}

// Unlike SQLite's inline "PRIMARY KEY AUTOINCREMENT", PostgreSQL's
// "GENERATED ALWAYS AS IDENTITY" does not imply PRIMARY KEY, so the
// table-level constraint is always emitted regardless of autoIncrement.
function generatePrimaryKeyConstraint(table: Table): string[] {
  const primaryKey = table.keys.find((key) => key.type === "PRIMARY_KEY");
  if (primaryKey === undefined) {
    return [];
  }
  return [`PRIMARY KEY (${columnNamesFor(table, primaryKey.columnIds).join(", ")})`];
}
