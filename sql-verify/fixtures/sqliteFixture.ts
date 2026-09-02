import type { Column, Schema } from "../../src/domain/schema";
import {
  SQLITE_COLUMN_TYPES,
  SQLITE_SIZABLE_COLUMN_TYPES,
} from "../../src/domain/sqlite/columnTypes";
import { createSchema } from "../../src/domain/schema";
import {
  mustAddColumn,
  mustAddForeignKey,
  mustAddKey,
  mustCreateTable,
  mustUpdateColumn,
} from "./domainAssertions";

const NOW = new Date("2026-09-02T00:00:00.000Z");

const BASE_COLUMN: Omit<Column, "id"> = {
  name: "placeholder",
  type: "TEXT",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

function col(overrides: Partial<Omit<Column, "id">>): Omit<Column, "id"> {
  return { ...BASE_COLUMN, ...overrides };
}

/**
 * A schema covering every SQLite-exportable feature: every column type
 * (plain and sized), inline PRIMARY KEY AUTOINCREMENT, NOT NULL, every
 * DEFAULT literal/keyword shape, a multi-column INDEX, a composite UNIQUE,
 * a composite PRIMARY KEY, and a FOREIGN KEY. Built through the same
 * domain factories the app itself uses, so it can only reach states the
 * UI can actually produce (see 0058); the `must*` wrappers (see
 * domainAssertions.ts) turn those factories' silent no-op-on-invalid-input
 * behavior into a thrown error, so a typo here can't silently shrink the
 * schema being verified.
 */
export function buildSqliteVerificationSchema(): Schema {
  let schema = createSchema("SQL Verify (SQLite)", { dialect: "sqlite", now: NOW });
  schema = mustCreateTable(schema, "items", { now: NOW });
  const itemsTableId = schema.tables[0].id;

  const idColumnId = crypto.randomUUID();
  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "id", type: "INTEGER", nullable: false }),
    { id: idColumnId, now: NOW },
  );

  for (const type of SQLITE_COLUMN_TYPES) {
    schema = mustAddColumn(schema, itemsTableId, col({ name: `col_${type.toLowerCase()}`, type }), {
      now: NOW,
    });
  }

  for (const type of SQLITE_SIZABLE_COLUMN_TYPES) {
    schema = mustAddColumn(
      schema,
      itemsTableId,
      col({ name: `col_${type.toLowerCase()}_sized`, type, size: "10" }),
      { now: NOW },
    );
  }

  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "col_not_null", type: "TEXT", nullable: false }),
    { now: NOW },
  );
  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "col_default_numeric", type: "INTEGER", defaultValue: "42" }),
    { now: NOW },
  );
  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "col_default_string", type: "TEXT", defaultValue: "O'Brien" }),
    { now: NOW },
  );
  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "col_default_current_timestamp", type: "TEXT", defaultValue: "CURRENT_TIMESTAMP" }),
    { now: NOW },
  );
  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "col_default_true", type: "TEXT", defaultValue: "TRUE" }),
    { now: NOW },
  );
  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "col_default_false", type: "TEXT", defaultValue: "FALSE" }),
    { now: NOW },
  );
  schema = mustAddColumn(
    schema,
    itemsTableId,
    col({ name: "col_default_null", type: "TEXT", defaultValue: "NULL" }),
    { now: NOW },
  );

  const idxAId = crypto.randomUUID();
  schema = mustAddColumn(schema, itemsTableId, col({ name: "col_idx_a", type: "TEXT" }), {
    id: idxAId,
    now: NOW,
  });
  const idxBId = crypto.randomUUID();
  schema = mustAddColumn(schema, itemsTableId, col({ name: "col_idx_b", type: "TEXT" }), {
    id: idxBId,
    now: NOW,
  });
  const uniqueAId = crypto.randomUUID();
  schema = mustAddColumn(schema, itemsTableId, col({ name: "col_unique_a", type: "TEXT" }), {
    id: uniqueAId,
    now: NOW,
  });
  const uniqueBId = crypto.randomUUID();
  schema = mustAddColumn(schema, itemsTableId, col({ name: "col_unique_b", type: "TEXT" }), {
    id: uniqueBId,
    now: NOW,
  });

  // AUTOINCREMENT eligibility requires the column to already be the table's
  // sole PRIMARY KEY column, so the key must exist before flipping the flag.
  schema = mustAddKey(
    schema,
    itemsTableId,
    { type: "PRIMARY_KEY", columnIds: [idColumnId] },
    { now: NOW },
  );
  schema = mustUpdateColumn(
    schema,
    itemsTableId,
    idColumnId,
    col({ name: "id", type: "INTEGER", nullable: false, autoIncrement: true, defaultValue: "1" }),
    (column) => column.autoIncrement && column.defaultValue === "1",
    { now: NOW },
  );

  schema = mustAddKey(schema, itemsTableId, { type: "INDEX", columnIds: [idxAId] }, { now: NOW });
  schema = mustAddKey(
    schema,
    itemsTableId,
    { type: "INDEX", columnIds: [idxAId, idxBId] },
    { now: NOW },
  );
  schema = mustAddKey(
    schema,
    itemsTableId,
    { type: "UNIQUE", columnIds: [uniqueAId, uniqueBId] },
    { now: NOW },
  );

  schema = mustCreateTable(schema, "item_variants", { now: NOW });
  const variantsTableId = schema.tables[1].id;

  const variantAId = crypto.randomUUID();
  schema = mustAddColumn(
    schema,
    variantsTableId,
    col({ name: "variant_a_id", type: "INTEGER", nullable: false }),
    { id: variantAId, now: NOW },
  );
  const variantBId = crypto.randomUUID();
  schema = mustAddColumn(
    schema,
    variantsTableId,
    col({ name: "variant_b_id", type: "INTEGER", nullable: false }),
    { id: variantBId, now: NOW },
  );
  const itemIdColumnId = crypto.randomUUID();
  schema = mustAddColumn(schema, variantsTableId, col({ name: "item_id", type: "INTEGER" }), {
    id: itemIdColumnId,
    now: NOW,
  });

  schema = mustAddKey(
    schema,
    variantsTableId,
    { type: "PRIMARY_KEY", columnIds: [variantAId, variantBId] },
    { now: NOW },
  );
  schema = mustAddForeignKey(
    schema,
    variantsTableId,
    { columnId: itemIdColumnId, referencedTableId: itemsTableId, referencedColumnId: idColumnId },
    { now: NOW },
  );

  return schema;
}
