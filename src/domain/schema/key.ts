import { getDialectStrategy } from "../dialect";
import { hasColumn, removeForeignKeysReferencingColumn } from "./shared";
import { KEY_TYPES, type Column, type Key, type KeyType, type Schema, type Table } from "./types";

/** Whether each key type is a single-column key solely owned by `columnId` (`null` for a not-yet-created column). */
export type ColumnKeyMembership = Record<KeyType, boolean>;

export const EMPTY_COLUMN_KEY_MEMBERSHIP: ColumnKeyMembership = {
  PRIMARY_KEY: false,
  UNIQUE: false,
  INDEX: false,
};

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
  const strategy = getDialectStrategy(schema.dialect);
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? strategy.normalizeColumnForDialect({ ...table, keys: [...table.keys, { id, ...fields }] })
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
  if (!canUpdateKey(schema.tables, targetTable, keyId, fields)) {
    return schema;
  }
  const { now = new Date() } = options;
  const strategy = getDialectStrategy(schema.dialect);
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? strategy.normalizeColumnForDialect({
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
  const targetKey = targetTable?.keys.find((key) => key.id === keyId);
  if (targetKey === undefined || isKeyReferencedByForeignKey(schema.tables, tableId, targetKey)) {
    return schema;
  }
  const { now = new Date() } = options;
  const strategy = getDialectStrategy(schema.dialect);
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId
        ? strategy.normalizeColumnForDialect({
            ...table,
            keys: table.keys.filter((key) => key.id !== keyId),
          })
        : table,
    ),
    updatedAt: now,
  };
}

/**
 * Removes `keyId` together with any other table's foreign key that
 * references it — the explicit-confirmation counterpart to `removeKey`'s
 * no-op guard, used by the SidePanel "delete key" flow once the user has
 * confirmed the cascading relation removal (see 0030).
 */
export function removeKeyCascadingForeignKeys(
  schema: Schema,
  tableId: string,
  keyId: string,
  options: RemoveKeyOptions = {},
): Schema {
  const targetTable = schema.tables.find((table) => table.id === tableId);
  const targetKey = targetTable?.keys.find((key) => key.id === keyId);
  if (targetKey === undefined) {
    return schema;
  }
  const withoutReferencingForeignKeys: Schema = {
    ...schema,
    tables: targetKey.columnIds.reduce(
      (tables, columnId) => removeForeignKeysReferencingColumn(tables, tableId, columnId),
      schema.tables,
    ),
  };
  return removeKey(withoutReferencingForeignKeys, tableId, keyId, options);
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

/** Whether the table has a primary key, inline (autoIncrement) or as a PRIMARY_KEY key. */
export function hasPrimaryKey(table: Table): boolean {
  return (
    table.keys.some((key) => key.type === "PRIMARY_KEY") ||
    table.columns.some((column) => column.autoIncrement)
  );
}

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

/** Why a `ColumnDialog` key-membership checkbox is disabled, or `null` if it isn't. */
export type KeyMembershipDisabledReason =
  | "CONFLICTING_PRIMARY_KEY"
  | "PART_OF_COMPOSITE_KEY"
  | "REFERENCED_BY_FOREIGN_KEY";

export type ColumnKeyMembershipDisabled = Record<KeyType, KeyMembershipDisabledReason | null>;

export const EMPTY_COLUMN_KEY_MEMBERSHIP_DISABLED: ColumnKeyMembershipDisabled = {
  PRIMARY_KEY: null,
  UNIQUE: null,
  INDEX: null,
};

export function getColumnKeyMembershipDisabled(
  table: Table,
  columnId: string | null,
  tables: Table[],
): ColumnKeyMembershipDisabled {
  const primaryKeyExcludeId =
    columnId !== null ? soleKeyOfType(table, columnId, "PRIMARY_KEY")?.id : undefined;
  return {
    PRIMARY_KEY: hasConflictingPrimaryKey(table, "PRIMARY_KEY", primaryKeyExcludeId)
      ? "CONFLICTING_PRIMARY_KEY"
      : isSoleKeyReferenced(table, columnId, tables, "PRIMARY_KEY")
        ? "REFERENCED_BY_FOREIGN_KEY"
        : null,
    UNIQUE:
      columnId !== null && isMemberOfCompositeKeyOfType(table, columnId, "UNIQUE")
        ? "PART_OF_COMPOSITE_KEY"
        : isSoleKeyReferenced(table, columnId, tables, "UNIQUE")
          ? "REFERENCED_BY_FOREIGN_KEY"
          : null,
    INDEX:
      columnId !== null && isMemberOfCompositeKeyOfType(table, columnId, "INDEX")
        ? "PART_OF_COMPOSITE_KEY"
        : null,
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

/** Whether some table's foreign key currently targets `columnId` on `tableId`. */
export function isColumnReferencedByForeignKey(
  tables: Table[],
  tableId: string,
  columnId: string,
): boolean {
  return tables.some((table) =>
    table.foreignKeys.some(
      (fk) => fk.referencedTableId === tableId && fk.referencedColumnId === columnId,
    ),
  );
}

/**
 * Whether removing/retyping `key` would break an existing foreign key that
 * targets it — only single-column PRIMARY_KEY/UNIQUE keys can be FK targets
 * (see `isReferenceableColumn`), so any other key is never "referenced".
 */
export function isKeyReferencedByForeignKey(tables: Table[], tableId: string, key: Key): boolean {
  return (
    (key.type === "PRIMARY_KEY" || key.type === "UNIQUE") &&
    key.columnIds.length === 1 &&
    isColumnReferencedByForeignKey(tables, tableId, key.columnIds[0])
  );
}

/** Whether updating `existingKey` to `fields` keeps it a sole PRIMARY_KEY/UNIQUE key on the same column. */
export function keepsColumnReferenceable(existingKey: Key, fields: Omit<Key, "id">): boolean {
  return (
    (fields.type === "PRIMARY_KEY" || fields.type === "UNIQUE") &&
    fields.columnIds.length === 1 &&
    fields.columnIds[0] === existingKey.columnIds[0]
  );
}

function canAddKey(table: Table | undefined, fields: Omit<Key, "id">): boolean {
  if (table === undefined || fields.columnIds.length === 0) {
    return false;
  }
  return !hasConflictingPrimaryKey(table, fields.type);
}

function canUpdateKey(
  tables: Table[],
  table: Table | undefined,
  keyId: string,
  fields: Omit<Key, "id">,
): boolean {
  const existingKey = table?.keys.find((key) => key.id === keyId);
  if (table === undefined || existingKey === undefined || fields.columnIds.length === 0) {
    return false;
  }
  if (hasConflictingPrimaryKey(table, fields.type, keyId)) {
    return false;
  }
  return (
    !isKeyReferencedByForeignKey(tables, table.id, existingKey) ||
    keepsColumnReferenceable(existingKey, fields)
  );
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

/** Whether `columnId`'s sole `type` key (if any) is currently targeted by another table's foreign key. */
function isSoleKeyReferenced(
  table: Table,
  columnId: string | null,
  tables: Table[],
  type: "PRIMARY_KEY" | "UNIQUE",
): boolean {
  if (columnId === null || soleKeyOfType(table, columnId, type) === undefined) {
    return false;
  }
  return isColumnReferencedByForeignKey(tables, table.id, columnId);
}
