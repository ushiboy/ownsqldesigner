import { z } from "zod";

export const DEFAULT_SCHEMA_NAME = "New Schema";

const GRID_COLUMNS = 4;
const GRID_CELL_WIDTH = 260;
const GRID_CELL_HEIGHT = 160;

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const positionSchema = z.object({ x: z.number(), y: z.number() });

export type Position = z.infer<typeof positionSchema>;

export const SQLITE_COLUMN_TYPES = ["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"] as const;

export type ColumnType = (typeof SQLITE_COLUMN_TYPES)[number];

export const columnSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  type: z.enum(SQLITE_COLUMN_TYPES),
  // Free-form and dialect-unenforced (SQLite ignores both); kept for
  // documentation and future dialects.
  size: z.string(),
  defaultValue: z.string(),
  nullable: z.boolean(),
  autoIncrement: z.boolean(),
  comment: z.string(),
});

export type Column = z.infer<typeof columnSchema>;

export const KEY_TYPES = ["PRIMARY_KEY", "UNIQUE", "INDEX"] as const;

export type KeyType = (typeof KEY_TYPES)[number];

export const keySchema = z.object({
  id: z.uuid(),
  type: z.enum(KEY_TYPES),
  columnIds: z.array(z.uuid()).min(1),
});

export type Key = z.infer<typeof keySchema>;

export const foreignKeySchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(),
  referencedTableId: z.uuid(),
  referencedColumnId: z.uuid(),
});

export type ForeignKey = z.infer<typeof foreignKeySchema>;

export const tableSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  comment: z.string(),
  position: positionSchema,
  columns: z.array(columnSchema),
  keys: z.array(keySchema),
  foreignKeys: z.array(foreignKeySchema),
});

export type Table = z.infer<typeof tableSchema>;

export const schemaSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  tables: z.array(tableSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Schema = z.infer<typeof schemaSchema>;

export type SchemaSummary = Pick<Schema, "id" | "name" | "updatedAt">;

type CreateSchemaOptions = {
  id?: string;
  now?: Date;
};

export function createSchema(name: string, options: CreateSchemaOptions = {}): Schema {
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    id,
    name,
    tables: [],
    createdAt: now,
    updatedAt: now,
  };
}

type RenameSchemaOptions = {
  now?: Date;
};

export function renameSchema(
  schema: Schema,
  name: string,
  options: RenameSchemaOptions = {},
): Schema {
  const { now = new Date() } = options;
  return {
    ...schema,
    name,
    updatedAt: now,
  };
}

type CreateTableOptions = {
  id?: string;
  now?: Date;
};

export function createTable(
  schema: Schema,
  name: string,
  options: CreateTableOptions = {},
): Schema {
  if (!isTableNameAvailable(schema, name)) {
    return schema;
  }
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    ...schema,
    tables: [
      ...schema.tables,
      {
        id,
        name,
        comment: "",
        position: defaultTablePosition(schema.tables.length),
        columns: [],
        keys: [],
        foreignKeys: [],
      },
    ],
    updatedAt: now,
  };
}

type RenameTableOptions = {
  now?: Date;
};

export function renameTable(
  schema: Schema,
  tableId: string,
  name: string,
  options: RenameTableOptions = {},
): Schema {
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  if (!isTableNameAvailable(schema, name, tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => (table.id === tableId ? { ...table, name } : table)),
    updatedAt: now,
  };
}

type UpdateTableCommentOptions = {
  now?: Date;
};

export function updateTableComment(
  schema: Schema,
  tableId: string,
  comment: string,
  options: UpdateTableCommentOptions = {},
): Schema {
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => (table.id === tableId ? { ...table, comment } : table)),
    updatedAt: now,
  };
}

type MoveTableOptions = {
  now?: Date;
};

export function moveTable(
  schema: Schema,
  tableId: string,
  position: Position,
  options: MoveTableOptions = {},
): Schema {
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) => (table.id === tableId ? { ...table, position } : table)),
    updatedAt: now,
  };
}

type RemoveTableOptions = {
  now?: Date;
};

export function removeTable(
  schema: Schema,
  tableId: string,
  options: RemoveTableOptions = {},
): Schema {
  if (!schema.tables.some((table) => table.id === tableId)) {
    return schema;
  }
  const { now = new Date() } = options;
  const remaining = schema.tables.filter((table) => table.id !== tableId);
  return {
    ...schema,
    tables: removeForeignKeysReferencingTable(remaining, tableId),
    updatedAt: now,
  };
}

type AddColumnOptions = {
  id?: string;
  now?: Date;
};

export function addColumn(
  schema: Schema,
  tableId: string,
  fields: Omit<Column, "id">,
  options: AddColumnOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!canAddColumn(targetTable, fields)) {
    return schema;
  }
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId ? { ...table, columns: [...table.columns, { id, ...fields }] } : table,
    ),
    updatedAt: now,
  };
}

type UpdateColumnOptions = {
  now?: Date;
};

export function updateColumn(
  schema: Schema,
  tableId: string,
  columnId: string,
  fields: Omit<Column, "id">,
  options: UpdateColumnOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!canUpdateColumn(targetTable, columnId, fields)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? withNormalizedAutoIncrement({
            ...table,
            columns: table.columns.map((column) =>
              column.id === columnId ? { id: columnId, ...fields } : column,
            ),
          })
        : table,
    ),
    updatedAt: now,
  };
}

type RemoveColumnOptions = {
  now?: Date;
};

export function removeColumn(
  schema: Schema,
  tableId: string,
  columnId: string,
  options: RemoveColumnOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!hasColumn(targetTable, columnId)) {
    return schema;
  }
  const { now = new Date() } = options;
  const tables = schema.tables.map((table) =>
    table.id === tableId
      ? withNormalizedAutoIncrement({
          ...table,
          columns: table.columns.filter((column) => column.id !== columnId),
          keys: removeColumnFromKeys(table.keys, columnId),
        })
      : table,
  );
  return {
    ...schema,
    tables: removeForeignKeysInvolvingColumn(tables, columnId),
    updatedAt: now,
  };
}

type AddKeyOptions = {
  id?: string;
  now?: Date;
};

export function addKey(
  schema: Schema,
  tableId: string,
  fields: Omit<Key, "id">,
  options: AddKeyOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!canAddKey(targetTable, fields)) {
    return schema;
  }
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? withNormalizedAutoIncrement({ ...table, keys: [...table.keys, { id, ...fields }] })
        : table,
    ),
    updatedAt: now,
  };
}

type UpdateKeyOptions = {
  now?: Date;
};

export function updateKey(
  schema: Schema,
  tableId: string,
  keyId: string,
  fields: Omit<Key, "id">,
  options: UpdateKeyOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!canUpdateKey(targetTable, keyId, fields)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? withNormalizedAutoIncrement({
            ...table,
            keys: table.keys.map((key) => (key.id === keyId ? { id: keyId, ...fields } : key)),
          })
        : table,
    ),
    updatedAt: now,
  };
}

type RemoveKeyOptions = {
  now?: Date;
};

export function removeKey(
  schema: Schema,
  tableId: string,
  keyId: string,
  options: RemoveKeyOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!hasKey(targetTable, keyId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? withNormalizedAutoIncrement({
            ...table,
            keys: table.keys.filter((key) => key.id !== keyId),
          })
        : table,
    ),
    updatedAt: now,
  };
}

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
  const { columnId = crypto.randomUUID(), foreignKeyId, now = new Date() } = options;
  const withColumn = addColumn(
    schema,
    childTableId,
    {
      name: uniqueColumnName(childTable, `${referencedTable.name}_${referencedColumn.name}`),
      type: referencedColumn.type,
      size: "",
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

/** Whether the table already has a PRIMARY KEY key other than `excludeKeyId`. */
export function hasConflictingPrimaryKey(
  table: Table,
  type: KeyType,
  excludeKeyId?: string,
): boolean {
  return (
    type === "PRIMARY_KEY" &&
    table.keys.some((key) => key.type === "PRIMARY_KEY" && key.id !== excludeKeyId)
  );
}

/** Whether each key type is a single-column key solely owned by `columnId` (`null` for a not-yet-created column). */
export type ColumnKeyMembership = Record<KeyType, boolean>;

export const EMPTY_COLUMN_KEY_MEMBERSHIP: ColumnKeyMembership = {
  PRIMARY_KEY: false,
  UNIQUE: false,
  INDEX: false,
};

type SetColumnKeyMembershipOptions = {
  now?: Date;
};

/**
 * Reconciles a column's single-column PRIMARY KEY / UNIQUE / INDEX membership
 * in one bumped-updatedAt step — the domain-level counterpart of the
 * ColumnDialog's combined key checkboxes (see 0007's "Alternatives Considered").
 * Composite (multi-column) keys are untouched; use addKey/updateKey/removeKey directly for those.
 */
export function setColumnKeyMembership(
  schema: Schema,
  tableId: string,
  columnId: string,
  membership: ColumnKeyMembership,
  options: SetColumnKeyMembershipOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  if (!hasColumn(targetTable, columnId)) {
    return schema;
  }
  const { now = new Date() } = options;
  return KEY_TYPES.reduce(
    (current, type) =>
      applyColumnKeyMembership(current, tableId, columnId, type, membership[type], now),
    schema,
  );
}

export function getColumnKeyMembership(table: Table, columnId: string | null): ColumnKeyMembership {
  if (columnId === null) {
    return EMPTY_COLUMN_KEY_MEMBERSHIP;
  }
  return {
    PRIMARY_KEY: soleKeyOfType(table, columnId, "PRIMARY_KEY") !== undefined,
    UNIQUE: soleKeyOfType(table, columnId, "UNIQUE") !== undefined,
    INDEX: soleKeyOfType(table, columnId, "INDEX") !== undefined,
  };
}

export function getColumnKeyMembershipDisabled(
  table: Table,
  columnId: string | null,
): ColumnKeyMembership {
  const primaryKeyExcludeId =
    columnId !== null ? soleKeyOfType(table, columnId, "PRIMARY_KEY")?.id : undefined;
  return {
    PRIMARY_KEY: hasConflictingPrimaryKey(table, "PRIMARY_KEY", primaryKeyExcludeId),
    UNIQUE: columnId !== null && isMemberOfCompositeKeyOfType(table, columnId, "UNIQUE"),
    INDEX: columnId !== null && isMemberOfCompositeKeyOfType(table, columnId, "INDEX"),
  };
}

/** Whether `columnId` may be a foreign key's target (REQ-020: the sole PRIMARY KEY or UNIQUE column). */
export function isReferenceableColumn(table: Table, columnId: string): boolean {
  return (
    soleKeyOfType(table, columnId, "PRIMARY_KEY") !== undefined ||
    soleKeyOfType(table, columnId, "UNIQUE") !== undefined
  );
}

export function getReferenceableColumns(table: Table): Column[] {
  return table.columns.filter((column) => isReferenceableColumn(table, column.id));
}

/** Whether `name` matches the unquoted-SQL-identifier shape required by REQ-019. */
export function isValidIdentifierName(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

/** Case-insensitive membership check, matching SQLite's own identifier comparison. */
export function isNameTaken(name: string, existingNames: string[]): boolean {
  const normalized = name.toLowerCase();
  return existingNames.some((existing) => existing.toLowerCase() === normalized);
}

/** Whether `name` is a valid identifier not already used by another table in `schema` (REQ-018/019). */
export function isTableNameAvailable(
  schema: Schema,
  name: string,
  excludeTableId?: string,
): boolean {
  return (
    isValidIdentifierName(name) &&
    !isNameTaken(
      name,
      schema.tables.filter((table) => table.id !== excludeTableId).map((table) => table.name),
    )
  );
}

/** Whether `name` is a valid identifier not already used by another column on `table` (REQ-018/019). */
export function isColumnNameAvailable(
  table: Table,
  name: string,
  excludeColumnId?: string,
): boolean {
  return (
    isValidIdentifierName(name) &&
    !isNameTaken(
      name,
      table.columns.filter((column) => column.id !== excludeColumnId).map((column) => column.name),
    )
  );
}

function hasColumn(table: Table | undefined, columnId: string): table is Table {
  return table !== undefined && table.columns.some((column) => column.id === columnId);
}

function canAddColumn(table: Table | undefined, fields: Omit<Column, "id">): boolean {
  return table !== undefined && isColumnNameAvailable(table, fields.name);
}

/** Suffixes `baseName` with `_2`, `_3`, ... until it doesn't collide with an existing column. */
function uniqueColumnName(table: Table, baseName: string): string {
  let candidate = baseName;
  let suffix = 2;
  while (!isColumnNameAvailable(table, candidate)) {
    candidate = `${baseName}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function canUpdateColumn(
  table: Table | undefined,
  columnId: string,
  fields: Omit<Column, "id">,
): boolean {
  return hasColumn(table, columnId) && isColumnNameAvailable(table, fields.name, columnId);
}

function hasKey(table: Table | undefined, keyId: string): boolean {
  return table !== undefined && table.keys.some((key) => key.id === keyId);
}

function canAddKey(table: Table | undefined, fields: Omit<Key, "id">): boolean {
  if (table === undefined || fields.columnIds.length === 0) {
    return false;
  }
  return !hasConflictingPrimaryKey(table, fields.type);
}

function canUpdateKey(table: Table | undefined, keyId: string, fields: Omit<Key, "id">): boolean {
  if (table === undefined || !hasKey(table, keyId) || fields.columnIds.length === 0) {
    return false;
  }
  return !hasConflictingPrimaryKey(table, fields.type, keyId);
}

function applyColumnKeyMembership(
  schema: Schema,
  tableId: string,
  columnId: string,
  type: KeyType,
  desired: boolean,
  now: Date,
): Schema {
  const table = schema.tables.find((t) => t.id === tableId);
  if (table === undefined) {
    return schema;
  }
  const existing = soleKeyOfType(table, columnId, type);
  if (desired && existing === undefined) {
    return addKey(schema, tableId, { type, columnIds: [columnId] }, { now });
  }
  if (!desired && existing !== undefined) {
    return removeKey(schema, tableId, existing.id, { now });
  }
  return schema;
}

function soleKeyOfType(table: Table, columnId: string, type: KeyType): Key | undefined {
  return table.keys.find(
    (key) => key.type === type && key.columnIds.length === 1 && key.columnIds[0] === columnId,
  );
}

function isMemberOfCompositeKeyOfType(table: Table, columnId: string, type: KeyType): boolean {
  return table.keys.some(
    (key) => key.type === type && key.columnIds.length > 1 && key.columnIds.includes(columnId),
  );
}

function removeColumnFromKeys(keys: Key[], columnId: string): Key[] {
  return keys
    .map((key) => ({ ...key, columnIds: key.columnIds.filter((id) => id !== columnId) }))
    .filter((key) => key.columnIds.length > 0);
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

function removeForeignKeysReferencingTable(tables: Table[], removedTableId: string): Table[] {
  return tables.map((table) => ({
    ...table,
    foreignKeys: table.foreignKeys.filter((fk) => fk.referencedTableId !== removedTableId),
  }));
}

function removeForeignKeysInvolvingColumn(tables: Table[], columnId: string): Table[] {
  return tables.map((table) => ({
    ...table,
    foreignKeys: table.foreignKeys.filter(
      (fk) => fk.columnId !== columnId && fk.referencedColumnId !== columnId,
    ),
  }));
}

function withNormalizedAutoIncrement(table: Table): Table {
  const pkColumnId = solePrimaryKeyColumnId(table);
  return {
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      autoIncrement: column.autoIncrement && isEligibleForAutoIncrement(column, pkColumnId),
    })),
  };
}

function solePrimaryKeyColumnId(table: Table): string | undefined {
  const primaryKey = table.keys.find((key) => key.type === "PRIMARY_KEY");
  return primaryKey !== undefined && primaryKey.columnIds.length === 1
    ? primaryKey.columnIds[0]
    : undefined;
}

function isEligibleForAutoIncrement(column: Column, pkColumnId: string | undefined): boolean {
  return column.type === "INTEGER" && column.id === pkColumnId;
}

function defaultTablePosition(index: number): Position {
  return {
    x: (index % GRID_COLUMNS) * GRID_CELL_WIDTH,
    y: Math.floor(index / GRID_COLUMNS) * GRID_CELL_HEIGHT,
  };
}
