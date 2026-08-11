import { addColumn, updateColumn } from "./column";
import { addForeignKey, removeForeignKey } from "./foreignKey";
import {
  addKey,
  getColumnKeyMembership,
  getColumnKeyMembershipDisabled,
  getReferenceableColumns,
  hasPrimaryKey,
  isColumnReferencedByForeignKey,
  isKeyReferencedByForeignKey,
  isReferenceableColumn,
  removeKey,
  removeKeyCascadingForeignKeys,
  setColumnKeyMembership,
  updateKey,
} from "./key";
import { createSchema, createTable } from "./table";
import {
  POSTS_FOREIGN_KEY_ID,
  POSTS_NEW_FOREIGN_KEY_ID,
  POSTS_TABLE_ID,
  POSTS_USER_ID_COLUMN_ID,
  USERS_EMAIL_COLUMN_ID,
  USERS_ID_COLUMN_ID,
  USERS_ID_KEY_ID,
  USERS_TABLE_ID,
  buildTwoTableSchema,
  columnFields,
  getTable,
} from "./test-fixtures";
import { schemaSchema } from "./types";

const keyFields = {
  type: "UNIQUE" as const,
  columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
};

describe("addKey", () => {
  const original = addColumn(
    createTable(
      createSchema("Blog Schema", {
        id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
        now: new Date("2026-07-18T09:00:00.000Z"),
      }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    columnFields,
    { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("appends a key to the matching table and bumps updatedAt", () => {
    const updated = addKey(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", keyFields, {
      id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated.tables[0]?.keys).toEqual([
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", ...keyFields },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = addKey(original, "unknown-id", keyFields, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("is a no-op when columnIds is empty", () => {
    const updated = addKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "UNIQUE", columnIds: [] },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when adding a second PRIMARY_KEY", () => {
    const withPrimaryKey = addKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", now: new Date("2026-07-19T09:00:00.000Z") },
    );

    const updated = addKey(
      withPrimaryKey,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { now: new Date("2026-07-20T09:00:00.000Z") },
    );

    expect(updated).toBe(withPrimaryKey);
  });

  it("does not mutate the input schema", () => {
    addKey(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", keyFields, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(original.tables[0]?.keys).toEqual([]);
  });

  it("produces a document that passes runtime validation", () => {
    const table = createTable(createSchema("Blog Schema"), "posts");
    const tableId = table.tables[0]?.id ?? "";
    const withColumn = addColumn(table, tableId, columnFields);
    const columnId = withColumn.tables[0]?.columns[0]?.id ?? "";

    const updated = addKey(withColumn, tableId, { type: "UNIQUE", columnIds: [columnId] });

    expect(schemaSchema.safeParse(updated).success).toBe(true);
  });
});

describe("updateKey", () => {
  const original = addKey(
    addColumn(
      createTable(
        createSchema("Blog Schema", {
          id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
          now: new Date("2026-07-18T09:00:00.000Z"),
        }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      columnFields,
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    keyFields,
    { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("replaces the matching key's fields and bumps updatedAt", () => {
    const updated = updateKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { type: "INDEX", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.keys).toEqual([
      {
        id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
        type: "INDEX",
        columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
      },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = updateKey(
      original,
      "unknown-id",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      keyFields,
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the key id is unknown", () => {
    const updated = updateKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "unknown-id",
      keyFields,
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when columnIds is empty", () => {
    const updated = updateKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { type: "UNIQUE", columnIds: [] },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when changing to PRIMARY_KEY while a different key already is one", () => {
    const withPrimaryKey = addKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = updateKey(
      withPrimaryKey,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(withPrimaryKey);
  });

  it("allows a key to keep its own PRIMARY_KEY type", () => {
    const withPrimaryKey = updateKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = updateKey(
      withPrimaryKey,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.keys[0]?.type).toBe("PRIMARY_KEY");
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("does not mutate the input schema", () => {
    updateKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { type: "INDEX", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(original.tables[0]?.keys[0]?.type).toBe("UNIQUE");
  });

  it("is a no-op when retyping a referenced key away from PRIMARY_KEY/UNIQUE", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = updateKey(withFk, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      type: "INDEX",
      columnIds: [USERS_ID_COLUMN_ID],
    });

    expect(updated).toBe(withFk);
  });

  it("is a no-op when adding a second column to a referenced key", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = updateKey(withFk, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      type: "UNIQUE",
      columnIds: [USERS_ID_COLUMN_ID, USERS_EMAIL_COLUMN_ID],
    });

    expect(updated).toBe(withFk);
  });

  it("allows toggling a referenced key between PRIMARY_KEY and UNIQUE on the same column", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = updateKey(withFk, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      type: "UNIQUE",
      columnIds: [USERS_ID_COLUMN_ID],
    });

    expect(getTable(updated, USERS_TABLE_ID).keys[0]?.type).toBe("UNIQUE");
  });
});

describe("removeKey", () => {
  const original = addKey(
    addColumn(
      createTable(
        createSchema("Blog Schema", {
          id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
          now: new Date("2026-07-18T09:00:00.000Z"),
        }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      columnFields,
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    keyFields,
    { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("removes the matching key and bumps updatedAt", () => {
    const updated = removeKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.keys).toEqual([]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = removeKey(original, "unknown-id", "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("is a no-op when the key id is unknown", () => {
    const updated = removeKey(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "unknown-id", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    removeKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(original.tables[0]?.keys).toHaveLength(1);
  });

  it("is a no-op when the key is referenced by another table's foreign key", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = removeKey(withFk, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(withFk);
  });

  it("removes the key once the referencing foreign key is gone", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withoutFk = removeForeignKey(withFk, POSTS_TABLE_ID, POSTS_FOREIGN_KEY_ID, {
      now: new Date("2026-07-18T09:30:00.000Z"),
    });

    const updated = removeKey(withoutFk, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, USERS_TABLE_ID).keys).toEqual([]);
  });
});

describe("removeKeyCascadingForeignKeys", () => {
  it("removes the key and the foreign key that referenced it in one step", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = removeKeyCascadingForeignKeys(withFk, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, USERS_TABLE_ID).keys).toEqual([]);
    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("leaves an unrelated foreign key on the same referenced table untouched", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withUniqueEmail = addKey(
      withFk,
      USERS_TABLE_ID,
      { type: "UNIQUE", columnIds: [USERS_EMAIL_COLUMN_ID] },
      { id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withSecondFk = addForeignKey(
      withUniqueEmail,
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_EMAIL_COLUMN_ID,
      },
      { id: POSTS_NEW_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = removeKeyCascadingForeignKeys(withSecondFk, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([
      expect.objectContaining({ id: POSTS_NEW_FOREIGN_KEY_ID }),
    ]);
  });

  it("is a no-op when the key id is unknown", () => {
    const schema = buildTwoTableSchema();

    const updated = removeKeyCascadingForeignKeys(schema, USERS_TABLE_ID, "unknown-id", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(schema);
  });

  it("removes an unreferenced key exactly like removeKey", () => {
    const schema = buildTwoTableSchema();

    const updated = removeKeyCascadingForeignKeys(schema, USERS_TABLE_ID, USERS_ID_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, USERS_TABLE_ID).keys).toEqual([]);
  });
});

describe("auto-increment normalization", () => {
  const withPrimaryKeyOnIntegerColumn = addKey(
    addColumn(
      createTable(
        createSchema("Blog Schema", {
          id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
          now: new Date("2026-07-18T09:00:00.000Z"),
        }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "id", type: "INTEGER" },
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
    { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("keeps autoIncrement on the sole INTEGER PRIMARY KEY column", () => {
    const updated = updateColumn(
      withPrimaryKeyOnIntegerColumn,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "id", type: "INTEGER", autoIncrement: true },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns[0]?.autoIncrement).toBe(true);
  });

  it("clears autoIncrement once the column is no longer the sole PRIMARY KEY column", () => {
    const withAutoIncrement = updateColumn(
      withPrimaryKeyOnIntegerColumn,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "id", type: "INTEGER", autoIncrement: true },
      { now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = removeKey(
      withAutoIncrement,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns[0]?.autoIncrement).toBe(false);
  });

  it("clears autoIncrement when the column type changes away from INTEGER", () => {
    const withAutoIncrement = updateColumn(
      withPrimaryKeyOnIntegerColumn,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "id", type: "INTEGER", autoIncrement: true },
      { now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = updateColumn(
      withAutoIncrement,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "id", type: "TEXT", autoIncrement: true },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns[0]?.autoIncrement).toBe(false);
  });
});

describe("getColumnKeyMembership", () => {
  const withTwoColumns = addColumn(
    addColumn(
      createTable(
        createSchema("Blog Schema", {
          id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
          now: new Date("2026-07-18T09:00:00.000Z"),
        }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "id", type: "INTEGER" },
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    { ...columnFields, name: "email" },
    { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const original = addKey(
    withTwoColumns,
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
    { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("returns all false for a not-yet-created column", () => {
    expect(
      getColumnKeyMembership(getTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12"), null),
    ).toEqual({
      PRIMARY_KEY: false,
      UNIQUE: false,
      INDEX: false,
    });
  });

  it("returns true only for the key type the column solely owns", () => {
    expect(
      getColumnKeyMembership(
        getTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12"),
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      ),
    ).toEqual({ PRIMARY_KEY: true, UNIQUE: false, INDEX: false });
  });

  it("returns all false for a column with no key membership", () => {
    expect(
      getColumnKeyMembership(
        getTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12"),
        "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      ),
    ).toEqual({ PRIMARY_KEY: false, UNIQUE: false, INDEX: false });
  });

  it("does not count membership in a composite key as sole ownership", () => {
    const withCompositeUnique = addKey(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      {
        type: "UNIQUE",
        columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d"],
      },
      { id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", now: new Date("2026-07-18T09:00:00.000Z") },
    );

    expect(
      getColumnKeyMembership(
        getTable(withCompositeUnique, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12"),
        "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      ).UNIQUE,
    ).toBe(false);
  });
});

describe("getColumnKeyMembershipDisabled", () => {
  const withTwoColumns = addColumn(
    addColumn(
      createTable(
        createSchema("Blog Schema", {
          id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
          now: new Date("2026-07-18T09:00:00.000Z"),
        }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "id", type: "INTEGER" },
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    { ...columnFields, name: "email" },
    { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("is all null when the table has no keys yet", () => {
    const table = getTable(withTwoColumns, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");
    expect(
      getColumnKeyMembershipDisabled(table, "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", [table]),
    ).toEqual({ PRIMARY_KEY: null, UNIQUE: null, INDEX: null });
  });

  it("disables PRIMARY_KEY (including for a not-yet-created column) once another column holds it", () => {
    const withPrimaryKey = addKey(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const table = getTable(withPrimaryKey, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");

    expect(getColumnKeyMembershipDisabled(table, null, [table]).PRIMARY_KEY).toBe(
      "CONFLICTING_PRIMARY_KEY",
    );
    expect(
      getColumnKeyMembershipDisabled(table, "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", [table])
        .PRIMARY_KEY,
    ).toBe("CONFLICTING_PRIMARY_KEY");
    expect(
      getColumnKeyMembershipDisabled(table, "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", [table])
        .PRIMARY_KEY,
    ).toBe(null);
  });

  it("disables UNIQUE/INDEX only for a column that is part of a composite key of that type", () => {
    const withCompositeUnique = addKey(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      {
        type: "UNIQUE",
        columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d"],
      },
      { id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const table = getTable(withCompositeUnique, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");

    expect(
      getColumnKeyMembershipDisabled(table, "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", [table]).UNIQUE,
    ).toBe("PART_OF_COMPOSITE_KEY");
    expect(
      getColumnKeyMembershipDisabled(table, "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", [table]).INDEX,
    ).toBe(null);
  });

  it("disables PRIMARY_KEY/UNIQUE with REFERENCED_BY_FOREIGN_KEY when another table's foreign key targets the column", () => {
    const withFk = addForeignKey(
      buildTwoTableSchema(),
      POSTS_TABLE_ID,
      {
        columnId: POSTS_USER_ID_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
      { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const users = getTable(withFk, USERS_TABLE_ID);

    expect(
      getColumnKeyMembershipDisabled(users, USERS_ID_COLUMN_ID, withFk.tables).PRIMARY_KEY,
    ).toBe("REFERENCED_BY_FOREIGN_KEY");
  });
});

describe("setColumnKeyMembership", () => {
  const withTwoColumns = addColumn(
    addColumn(
      createTable(
        createSchema("Blog Schema", {
          id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
          now: new Date("2026-07-18T09:00:00.000Z"),
        }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "id", type: "INTEGER" },
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    { ...columnFields, name: "email" },
    { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("adds a PRIMARY KEY key when set true and none exists", () => {
    const updated = setColumnKeyMembership(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12").keys).toEqual([
      {
        id: expect.any(String),
        type: "PRIMARY_KEY",
        columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
      },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("sets multiple key types for the same column in one call", () => {
    const updated = setColumnKeyMembership(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { PRIMARY_KEY: true, UNIQUE: true, INDEX: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    const types = getTable(updated, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12")
      .keys.map((key) => key.type)
      .toSorted();
    expect(types).toEqual(["PRIMARY_KEY", "UNIQUE"]);
  });

  it("removes an existing key when set false", () => {
    const withUnique = setColumnKeyMembership(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      { PRIMARY_KEY: false, UNIQUE: true, INDEX: false },
      { now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = setColumnKeyMembership(
      withUnique,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      { PRIMARY_KEY: false, UNIQUE: false, INDEX: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12").keys).toEqual([]);
  });

  it("is a no-op when the membership already matches", () => {
    const updated = setColumnKeyMembership(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { PRIMARY_KEY: false, UNIQUE: false, INDEX: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(withTwoColumns);
  });

  it("is a no-op when the column id is unknown", () => {
    const updated = setColumnKeyMembership(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "unknown-id",
      { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(withTwoColumns);
  });

  it("still applies UNIQUE/INDEX even when PRIMARY_KEY conflicts with an existing PK elsewhere", () => {
    const withPrimaryKeyOnOtherColumn = addKey(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = setColumnKeyMembership(
      withPrimaryKeyOnOtherColumn,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      { PRIMARY_KEY: true, UNIQUE: true, INDEX: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    const table = getTable(updated, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");
    expect(
      table.keys.some(
        (key) =>
          key.type === "UNIQUE" && key.columnIds[0] === "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      ),
    ).toBe(true);
    expect(
      table.keys.filter(
        (key) =>
          key.type === "PRIMARY_KEY" && key.columnIds[0] === "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      ),
    ).toEqual([]);
  });

  it("produces a document that passes runtime validation", () => {
    const table = createTable(createSchema("Blog Schema"), "posts");
    const tableId = table.tables[0]?.id ?? "";
    const withColumn = addColumn(table, tableId, columnFields);
    const columnId = withColumn.tables[0]?.columns[0]?.id ?? "";

    const updated = setColumnKeyMembership(withColumn, tableId, columnId, {
      PRIMARY_KEY: true,
      UNIQUE: false,
      INDEX: false,
    });

    expect(schemaSchema.safeParse(updated).success).toBe(true);
  });
});

describe("isReferenceableColumn / getReferenceableColumns", () => {
  const schema = buildTwoTableSchema();

  it("is true for the sole PRIMARY KEY column", () => {
    const users = getTable(schema, USERS_TABLE_ID);
    expect(isReferenceableColumn(users, USERS_ID_COLUMN_ID)).toBe(true);
    expect(getReferenceableColumns(users)).toEqual([
      expect.objectContaining({ id: USERS_ID_COLUMN_ID }),
    ]);
  });

  it("is false for a column with no PRIMARY KEY or UNIQUE membership", () => {
    const users = getTable(schema, USERS_TABLE_ID);
    expect(isReferenceableColumn(users, USERS_EMAIL_COLUMN_ID)).toBe(false);
  });
});

describe("isColumnReferencedByForeignKey / isKeyReferencedByForeignKey", () => {
  const withFk = addForeignKey(
    buildTwoTableSchema(),
    POSTS_TABLE_ID,
    {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    },
    { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("is true for a column targeted by another table's foreign key", () => {
    expect(isColumnReferencedByForeignKey(withFk.tables, USERS_TABLE_ID, USERS_ID_COLUMN_ID)).toBe(
      true,
    );
  });

  it("is false for a column no foreign key targets", () => {
    expect(
      isColumnReferencedByForeignKey(withFk.tables, USERS_TABLE_ID, USERS_EMAIL_COLUMN_ID),
    ).toBe(false);
  });

  it("is true for the referenced sole PRIMARY_KEY/UNIQUE key", () => {
    const usersKey = getTable(withFk, USERS_TABLE_ID).keys[0];
    if (usersKey === undefined) {
      throw new Error("expected users table to have a key");
    }
    expect(isKeyReferencedByForeignKey(withFk.tables, USERS_TABLE_ID, usersKey)).toBe(true);
  });

  it("is false for an INDEX key even on a referenced column", () => {
    expect(
      isKeyReferencedByForeignKey(withFk.tables, USERS_TABLE_ID, {
        id: "index-key-id",
        type: "INDEX",
        columnIds: [USERS_ID_COLUMN_ID],
      }),
    ).toBe(false);
  });

  it("is false for a composite key even on a referenced column", () => {
    expect(
      isKeyReferencedByForeignKey(withFk.tables, USERS_TABLE_ID, {
        id: "composite-key-id",
        type: "UNIQUE",
        columnIds: [USERS_ID_COLUMN_ID, USERS_EMAIL_COLUMN_ID],
      }),
    ).toBe(false);
  });
});

describe("hasPrimaryKey", () => {
  const schema = buildTwoTableSchema();

  it("is true for a table with a PRIMARY_KEY key", () => {
    const users = getTable(schema, USERS_TABLE_ID);
    expect(hasPrimaryKey(users)).toBe(true);
  });

  it("is false for a table with no PRIMARY_KEY key and no autoIncrement column", () => {
    const posts = getTable(schema, POSTS_TABLE_ID);
    expect(hasPrimaryKey(posts)).toBe(false);
  });

  it("is true for a table whose sole INTEGER PRIMARY KEY column has autoIncrement set", () => {
    const withPrimaryKeyOnIntegerColumn = addKey(
      addColumn(
        createTable(
          createSchema("Blog Schema", {
            id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
            now: new Date("2026-07-18T09:00:00.000Z"),
          }),
          "posts",
          { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
        ),
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        { ...columnFields, name: "id", type: "INTEGER" },
        { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withAutoIncrement = updateColumn(
      withPrimaryKeyOnIntegerColumn,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "id", type: "INTEGER", autoIncrement: true },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(hasPrimaryKey(getTable(withAutoIncrement, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12"))).toBe(
      true,
    );
  });
});
