import { getDialectStrategy } from "../dialect";
import { addColumn, uniqueColumnName } from "./column";
import { isReferenceableColumn } from "./key";
import { hasColumn } from "./shared";
import type { Column, ForeignKey, Schema, Table } from "./types";

/** Selects how `addForeignKeyWithNewColumn` names the generated child column (REQ-016/REQ-032). */
export type FkNamingPattern = "tableColumn" | "tableId";

export const DEFAULT_FK_NAMING_PATTERN: FkNamingPattern = "tableColumn";

type AddForeignKeyOptions = {
  id?: string;
  now?: Date;
};

export function addForeignKey(
  schema: Schema,
  tableId: string,
  fields: Omit<ForeignKey, "id">,
  options: AddForeignKeyOptions = {},
): Schema {
  if (!canAddForeignKey(schema, tableId, fields)) {
    return schema;
  }
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? { ...table, foreignKeys: [...table.foreignKeys, { id, ...fields }] }
        : table,
    ),
    updatedAt: now,
  };
}

type AddForeignKeyWithNewColumnOptions = {
  columnId?: string;
  foreignKeyId?: string;
  now?: Date;
  namingPattern?: FkNamingPattern;
};

/**
 * Creates a new child column on `childTableId` and a foreign key referencing
 * `referencedColumnId` in one step (REQ-016). The new column's name is
 * derived from the referenced table/column and auto-suffixed on collision
 * (see docs/design/0012-foreign-key-child-column-generation.md); its type
 * copies the referenced column's type.
 */
export function addForeignKeyWithNewColumn(
  schema: Schema,
  childTableId: string,
  referencedTableId: string,
  referencedColumnId: string,
  options: AddForeignKeyWithNewColumnOptions = {},
): Schema {
  const targets = resolveForeignKeyWithNewColumnTargets(
    schema,
    childTableId,
    referencedTableId,
    referencedColumnId,
  );
  if (targets === null) {
    return schema;
  }
  const { childTable, referencedTable, referencedColumn } = targets;
  const {
    columnId = crypto.randomUUID(),
    foreignKeyId,
    now = new Date(),
    namingPattern = DEFAULT_FK_NAMING_PATTERN,
  } = options;
  const strategy = getDialectStrategy(schema.dialect);
  const withColumn = addColumn(
    schema,
    childTableId,
    {
      name: uniqueColumnName(
        childTable,
        buildForeignKeyChildColumnName(namingPattern, referencedTable, referencedColumn),
        strategy,
      ),
      type: referencedColumn.type,
      size: referencedColumn.size,
      precision: referencedColumn.precision,
      defaultValue: "",
      nullable: true,
      autoIncrement: false,
      comment: "",
    },
    { id: columnId, now },
  );
  return addForeignKey(
    withColumn,
    childTableId,
    { columnId, referencedTableId, referencedColumnId },
    { id: foreignKeyId, now },
  );
}

/** Builds the pre-collision-check name for a generated child column, per the selected pattern (see docs/design/0025). */
function buildForeignKeyChildColumnName(
  pattern: FkNamingPattern,
  referencedTable: Table,
  referencedColumn: Column,
): string {
  switch (pattern) {
    case "tableColumn":
      return `${referencedTable.name}_${referencedColumn.name}`;
    case "tableId":
      return `${referencedTable.name}_id`;
  }
}

type RemoveForeignKeyOptions = {
  now?: Date;
};

export function removeForeignKey(
  schema: Schema,
  tableId: string,
  foreignKeyId: string,
  options: RemoveForeignKeyOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!hasForeignKey(targetTable, foreignKeyId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? { ...table, foreignKeys: table.foreignKeys.filter((fk) => fk.id !== foreignKeyId) }
        : table,
    ),
    updatedAt: now,
  };
}

function hasForeignKey(table: Table | undefined, foreignKeyId: string): boolean {
  return table !== undefined && table.foreignKeys.some((fk) => fk.id === foreignKeyId);
}

function canAddForeignKey(
  schema: Schema,
  tableId: string,
  fields: Omit<ForeignKey, "id">,
): boolean {
  const table = schema.tables.find((t) => t.id === tableId);
  const referencedTable = schema.tables.find((t) => t.id === fields.referencedTableId);
  if (table === undefined || referencedTable === undefined) {
    return false;
  }
  if (!hasColumn(table, fields.columnId)) {
    return false;
  }
  return isReferenceableColumn(referencedTable, fields.referencedColumnId);
}

type ForeignKeyWithNewColumnTargets = {
  childTable: Table;
  referencedTable: Table;
  referencedColumn: Column;
};

/** Resolves and validates the tables/column REQ-016 needs, or `null` if any precondition fails. */
function resolveForeignKeyWithNewColumnTargets(
  schema: Schema,
  childTableId: string,
  referencedTableId: string,
  referencedColumnId: string,
): ForeignKeyWithNewColumnTargets | null {
  const childTable = schema.tables.find((table) => table.id === childTableId);
  const referencedTable = schema.tables.find((table) => table.id === referencedTableId);
  const referencedColumn = referencedTable?.columns.find(
    (column) => column.id === referencedColumnId,
  );
  if (
    childTable === undefined ||
    referencedTable === undefined ||
    referencedColumn === undefined ||
    !isReferenceableColumn(referencedTable, referencedColumnId)
  ) {
    return null;
  }
  return { childTable, referencedTable, referencedColumn };
}
