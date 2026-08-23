import type { Column, ForeignKey, Key, Table } from "../schema/types";

/** The atomic per-dialect rules `generateDdl`'s shared skeleton needs — column syntax and PRIMARY KEY placement vary by dialect, the rest doesn't. */
export type GenerateDdlConfig = {
  /** Renders one column's full definition line, including any dialect-specific auto-increment/identity syntax. */
  generateColumnDefinition(column: Column): string;
  /** The table-level PRIMARY KEY constraint line(s), or `[]` if the dialect declares it inline on the column instead (or there is none). */
  generatePrimaryKeyConstraint(table: Table): string[];
};

/**
 * Generic CREATE TABLE / CREATE INDEX DDL generation shared by every SQL
 * dialect strategy; only `GenerateDdlConfig`'s two hooks vary per dialect
 * (see docs/design/0026's `buildDialectStrategy`, which factors out
 * dialect-independent algorithms the same way).
 */
export function generateDdl(tables: Table[], config: GenerateDdlConfig): string {
  const tablesById = new Map(tables.map((table) => [table.id, table]));
  const usedIndexNames = new Set<string>();
  const statements = [
    ...tables.map((table) => generateCreateTableStatement(table, tablesById, config)),
    ...tables.flatMap((table) => generateCreateIndexStatements(table, usedIndexNames)),
  ];
  return statements.join("\n\n");
}

/** Resolves `columnIds` to names, for a dialect's own `generatePrimaryKeyConstraint`. */
export function columnNamesFor(table: Table, columnIds: string[]): string[] {
  return columnIds.map((columnId) => findColumnName(table, columnId));
}

function generateCreateTableStatement(
  table: Table,
  tablesById: Map<string, Table>,
  config: GenerateDdlConfig,
): string {
  const lines = [
    ...table.columns.map((column) => config.generateColumnDefinition(column)),
    ...generateTableConstraints(table, tablesById, config),
  ];
  return `CREATE TABLE ${table.name} (\n${lines.map((line) => `  ${line}`).join(",\n")}\n);`;
}

function generateCreateIndexStatements(table: Table, usedIndexNames: Set<string>): string[] {
  return table.keys
    .filter((key) => key.type === "INDEX")
    .map((key) => generateCreateIndexStatement(table, key, usedIndexNames));
}

function generateTableConstraints(
  table: Table,
  tablesById: Map<string, Table>,
  config: GenerateDdlConfig,
): string[] {
  return [
    ...config.generatePrimaryKeyConstraint(table),
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
