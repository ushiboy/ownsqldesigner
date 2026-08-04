import type { Column, ForeignKey, Key, Table } from "../schema/types";

const DEFAULT_VALUE_NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

export function generateSqliteDdl(tables: Table[]): string {
  const tablesById = new Map(tables.map((table) => [table.id, table]));
  const usedIndexNames = new Set<string>();
  const statements = [
    ...tables.map((table) => generateCreateTableStatement(table, tablesById)),
    ...tables.flatMap((table) => generateCreateIndexStatements(table, usedIndexNames)),
  ];
  return statements.join("\n\n");
}

function generateCreateTableStatement(table: Table, tablesById: Map<string, Table>): string {
  const lines = [
    ...table.columns.map((column) => generateColumnDefinition(column)),
    ...generateTableConstraints(table, tablesById),
  ];
  return `CREATE TABLE ${table.name} (\n${lines.map((line) => `  ${line}`).join(",\n")}\n);`;
}

function generateCreateIndexStatements(table: Table, usedIndexNames: Set<string>): string[] {
  return table.keys
    .filter((key) => key.type === "INDEX")
    .map((key) => generateCreateIndexStatement(table, key, usedIndexNames));
}

// Duplicates schema/column.ts's formatColumnType rather than importing it:
// this module is reached from getDialectStrategy, so a runtime import back
// into schema/column.ts (which itself calls getDialectStrategy) would be
// circular. Only type-only imports from schema/types are safe here.
function generateColumnDefinition(column: Column): string {
  const type = column.size === "" ? column.type : `${column.type}(${column.size})`;
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

function generateTableConstraints(table: Table, tablesById: Map<string, Table>): string[] {
  return [
    ...generatePrimaryKeyConstraint(table),
    ...table.keys
      .filter((key) => key.type === "UNIQUE")
      .map((key) => generateUniqueConstraint(table, key)),
    ...table.foreignKeys.map((foreignKey) =>
      generateForeignKeyConstraint(table, foreignKey, tablesById),
    ),
  ];
}

function generateCreateIndexStatement(table: Table, key: Key, usedIndexNames: Set<string>): string {
  const columnNames = columnNamesFor(table, key.columnIds);
  const name = uniqueIndexName(`idx_${table.name}_${columnNames.join("_")}`, usedIndexNames);
  return `CREATE INDEX ${name} ON ${table.name} (${columnNames.join(", ")});`;
}

function formatDefaultValue(raw: string): string {
  return DEFAULT_VALUE_NUMERIC_PATTERN.test(raw) ? raw : `'${raw.replace(/'/g, "''")}'`;
}

function generatePrimaryKeyConstraint(table: Table): string[] {
  // AUTOINCREMENT is rendered inline on the column instead (see
  // generateColumnDefinition); REQ-033's normalizeAutoIncrement invariant
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

function generateUniqueConstraint(table: Table, key: Key): string {
  return `UNIQUE (${columnNamesFor(table, key.columnIds).join(", ")})`;
}

function generateForeignKeyConstraint(
  table: Table,
  foreignKey: ForeignKey,
  tablesById: Map<string, Table>,
): string {
  const referencedTable = tablesById.get(foreignKey.referencedTableId);
  const referencedTableName = referencedTable?.name ?? foreignKey.referencedTableId;
  const referencedColumnName =
    referencedTable !== undefined
      ? findColumnName(referencedTable, foreignKey.referencedColumnId)
      : foreignKey.referencedColumnId;
  return `FOREIGN KEY (${findColumnName(table, foreignKey.columnId)}) REFERENCES ${referencedTableName}(${referencedColumnName})`;
}

function columnNamesFor(table: Table, columnIds: string[]): string[] {
  return columnIds.map((columnId) => findColumnName(table, columnId));
}

// Domain invariants guarantee a key/foreign-key's column ids always resolve
// to an existing column; the id fallback here is unreachable defense-in-depth.
function findColumnName(table: Table, columnId: string): string {
  return table.columns.find((column) => column.id === columnId)?.name ?? columnId;
}

function uniqueIndexName(baseName: string, usedIndexNames: Set<string>): string {
  let candidate = baseName;
  let suffix = 2;
  while (usedIndexNames.has(candidate)) {
    candidate = `${baseName}_${suffix}`;
    suffix += 1;
  }
  usedIndexNames.add(candidate);
  return candidate;
}
