export { addColumn, formatColumnType, removeColumn, updateColumn } from "./column";
export { addForeignKey, addForeignKeyWithNewColumn, removeForeignKey } from "./foreignKey";
export { importSchema, isSchemaIntegrityValid, parseSchemaFile } from "./integrity";
export {
  EMPTY_COLUMN_KEY_MEMBERSHIP,
  addKey,
  getColumnKeyMembership,
  getColumnKeyMembershipDisabled,
  getReferenceableColumns,
  hasConflictingPrimaryKey,
  hasPrimaryKey,
  isReferenceableColumn,
  removeKey,
  setColumnKeyMembership,
  updateKey,
  type ColumnKeyMembership,
} from "./key";
export {
  createSchema,
  createTable,
  moveTable,
  moveTables,
  removeTable,
  renameSchema,
  renameTable,
  restoreSchema,
  updateTableComment,
} from "./table";
export {
  DEFAULT_SCHEMA_NAME,
  SQLITE_COLUMN_TYPES,
  KEY_TYPES,
  columnSchema,
  foreignKeySchema,
  keySchema,
  schemaSchema,
  tableSchema,
  type Column,
  type ColumnType,
  type ForeignKey,
  type Key,
  type KeyType,
  type Position,
  type Schema,
  type SchemaSummary,
  type Table,
} from "./types";
export {
  describeNameValidity,
  isColumnNameAvailable,
  isNameTaken,
  isTableNameAvailable,
  isValidIdentifierName,
  type NameValidity,
} from "./validation";
