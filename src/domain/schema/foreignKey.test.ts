import { addColumn, removeColumn } from "./column";
import { addForeignKey, addForeignKeyWithNewColumn, removeForeignKey } from "./foreignKey";
import { addKey } from "./key";
import { createSchema, createTable, removeTable, removeTables } from "./table";
import {
  POSTS_FOREIGN_KEY_ID,
  POSTS_NEW_COLUMN_ID,
  POSTS_NEW_FOREIGN_KEY_ID,
  POSTS_TABLE_ID,
  POSTS_USER_ID_COLUMN_ID,
  USERS_EMAIL_COLUMN_ID,
  USERS_ID_COLUMN_ID,
  USERS_TABLE_ID,
  buildTwoTableSchema,
  columnFields,
  getTable,
} from "./test-fixtures";
import { schemaSchema } from "./types";

describe("addForeignKey", () => {
  const original = buildTwoTableSchema();
  const fields = {
    columnId: POSTS_USER_ID_COLUMN_ID,
    referencedTableId: USERS_TABLE_ID,
    referencedColumnId: USERS_ID_COLUMN_ID,
  };

  it("appends a foreign key to the owning table and bumps updatedAt", () => {
    const updated = addForeignKey(original, POSTS_TABLE_ID, fields, {
      id: POSTS_FOREIGN_KEY_ID,
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([
      { id: POSTS_FOREIGN_KEY_ID, ...fields },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("is a no-op when the owning table id is unknown", () => {
    const updated = addForeignKey(original, "unknown-id", fields, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("is a no-op when the child column does not belong to the owning table", () => {
    const updated = addForeignKey(
      original,
      POSTS_TABLE_ID,
      { ...fields, columnId: "unknown-id" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the referenced table is unknown", () => {
    const updated = addForeignKey(
      original,
      POSTS_TABLE_ID,
      { ...fields, referencedTableId: "unknown-id" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the referenced column is not a PRIMARY KEY or UNIQUE column (REQ-020)", () => {
    const updated = addForeignKey(
      original,
      POSTS_TABLE_ID,
      { ...fields, referencedColumnId: USERS_EMAIL_COLUMN_ID },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    addForeignKey(original, POSTS_TABLE_ID, fields, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(original, POSTS_TABLE_ID).foreignKeys).toEqual([]);
  });

  it("produces a document that passes runtime validation", () => {
    const updated = addForeignKey(original, POSTS_TABLE_ID, fields);

    expect(schemaSchema.safeParse(updated).success).toBe(true);
  });
});

describe("addForeignKeyWithNewColumn", () => {
  const original = buildTwoTableSchema();

  it("creates a new child column and a foreign key referencing it in one call", () => {
    const updated = addForeignKeyWithNewColumn(
      original,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      {
        columnId: POSTS_NEW_COLUMN_ID,
        foreignKeyId: POSTS_NEW_FOREIGN_KEY_ID,
        now: new Date("2026-07-19T09:00:00.000Z"),
      },
    );

    const posts = getTable(updated, POSTS_TABLE_ID);
    expect(posts.columns.at(-1)).toEqual({
      id: POSTS_NEW_COLUMN_ID,
      name: "users_id",
      type: "INTEGER",
      size: "",
      precision: "",
      defaultValue: "",
      nullable: true,
      autoIncrement: false,
      comment: "",
    });
    expect(posts.foreignKeys).toEqual([
      {
        id: POSTS_NEW_FOREIGN_KEY_ID,
        columnId: POSTS_NEW_COLUMN_ID,
        referencedTableId: USERS_TABLE_ID,
        referencedColumnId: USERS_ID_COLUMN_ID,
      },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("defaults to the tableColumn naming pattern when none is specified", () => {
    const updated = addForeignKeyWithNewColumn(
      original,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, POSTS_TABLE_ID).columns.at(-1)?.name).toBe("users_id");
  });

  it("ignores the referenced column's own name under the tableId naming pattern", () => {
    const withUniqueEmail = addKey(
      original,
      USERS_TABLE_ID,
      { type: "UNIQUE", columnIds: [USERS_EMAIL_COLUMN_ID] },
      { now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = addForeignKeyWithNewColumn(
      withUniqueEmail,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_EMAIL_COLUMN_ID,
      { namingPattern: "tableId", now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, POSTS_TABLE_ID).columns.at(-1)?.name).toBe("users_id");
  });

  it("uses the referenced column's own name under the tableColumn naming pattern", () => {
    const withUniqueEmail = addKey(
      original,
      USERS_TABLE_ID,
      { type: "UNIQUE", columnIds: [USERS_EMAIL_COLUMN_ID] },
      { now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = addForeignKeyWithNewColumn(
      withUniqueEmail,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_EMAIL_COLUMN_ID,
      { namingPattern: "tableColumn", now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, POSTS_TABLE_ID).columns.at(-1)?.name).toBe("users_email");
  });

  it("auto-suffixes the generated name on collision", () => {
    const withExistingColumn = addColumn(
      original,
      POSTS_TABLE_ID,
      { ...columnFields, name: "users_id" },
      { now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = addForeignKeyWithNewColumn(
      withExistingColumn,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, POSTS_TABLE_ID).columns.at(-1)?.name).toBe("users_id_2");
  });

  it("is a no-op when the child table id is unknown", () => {
    const updated = addForeignKeyWithNewColumn(
      original,
      "unknown-id",
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the referenced table is unknown", () => {
    const updated = addForeignKeyWithNewColumn(
      original,
      POSTS_TABLE_ID,
      "unknown-id",
      USERS_ID_COLUMN_ID,
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the referenced column is not a PRIMARY KEY or UNIQUE column (REQ-020)", () => {
    const updated = addForeignKeyWithNewColumn(
      original,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_EMAIL_COLUMN_ID,
    );

    expect(updated).toBe(original);
  });

  it("succeeds for a self-reference (child and referenced table are the same)", () => {
    const updated = addForeignKeyWithNewColumn(
      original,
      USERS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    const users = getTable(updated, USERS_TABLE_ID);
    expect(users.columns.at(-1)?.name).toBe("users_id");
    expect(users.foreignKeys).toHaveLength(1);
  });

  it("does not mutate the input schema", () => {
    addForeignKeyWithNewColumn(original, POSTS_TABLE_ID, USERS_TABLE_ID, USERS_ID_COLUMN_ID);

    expect(getTable(original, POSTS_TABLE_ID).foreignKeys).toEqual([]);
  });

  it("produces a document that passes runtime validation", () => {
    const updated = addForeignKeyWithNewColumn(
      original,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
    );

    expect(schemaSchema.safeParse(updated).success).toBe(true);
  });
});

describe("addForeignKeyWithNewColumn inherits the parent's size/precision (0038)", () => {
  it("copies the referenced column's size (SQLite)", () => {
    const withSizedColumn = addColumn(
      buildTwoTableSchema(),
      USERS_TABLE_ID,
      { ...columnFields, name: "code", type: "TEXT", size: "50" },
      { id: "13131313-1313-4131-8131-131313131313", now: new Date("2026-08-15T09:00:00.000Z") },
    );
    const withUniqueKey = addKey(
      withSizedColumn,
      USERS_TABLE_ID,
      { type: "UNIQUE", columnIds: ["13131313-1313-4131-8131-131313131313"] },
      { id: "14141414-1414-4141-8141-141414141414", now: new Date("2026-08-15T09:00:00.000Z") },
    );

    const updated = addForeignKeyWithNewColumn(
      withUniqueKey,
      POSTS_TABLE_ID,
      USERS_TABLE_ID,
      "13131313-1313-4131-8131-131313131313",
      { columnId: POSTS_NEW_COLUMN_ID, now: new Date("2026-08-15T09:00:00.000Z") },
    );

    expect(getTable(updated, POSTS_TABLE_ID).columns.at(-1)).toMatchObject({
      type: "TEXT",
      size: "50",
      precision: "",
    });
  });

  it("copies the referenced column's size (PostgreSQL VARCHAR)", () => {
    const withUsersTable = createTable(
      createSchema("PG Schema", {
        id: "11111111-1111-4111-8111-111111111111",
        now: new Date("2026-08-15T09:00:00.000Z"),
        dialect: "postgresql",
      }),
      "users",
      { id: "22222222-2222-4222-8222-222222222222", now: new Date("2026-08-15T09:00:00.000Z") },
    );
    const withEmailColumn = addColumn(
      withUsersTable,
      "22222222-2222-4222-8222-222222222222",
      { ...columnFields, name: "email", type: "VARCHAR", size: "255" },
      { id: "33333333-3333-4333-8333-333333333333", now: new Date("2026-08-15T09:00:00.000Z") },
    );
    const withUniqueKey = addKey(
      withEmailColumn,
      "22222222-2222-4222-8222-222222222222",
      { type: "UNIQUE", columnIds: ["33333333-3333-4333-8333-333333333333"] },
      { id: "44444444-4444-4444-8444-444444444444", now: new Date("2026-08-15T09:00:00.000Z") },
    );
    const withPostsTable = createTable(withUniqueKey, "posts", {
      id: "55555555-5555-4555-8555-555555555555",
      now: new Date("2026-08-15T09:00:00.000Z"),
    });

    const updated = addForeignKeyWithNewColumn(
      withPostsTable,
      "55555555-5555-4555-8555-555555555555",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      {
        columnId: "66666666-6666-4666-8666-666666666666",
        now: new Date("2026-08-15T09:00:00.000Z"),
      },
    );

    expect(getTable(updated, "55555555-5555-4555-8555-555555555555").columns.at(-1)).toMatchObject({
      type: "VARCHAR",
      size: "255",
      precision: "",
    });
  });

  it("copies the referenced column's precision (PostgreSQL TIMESTAMP)", () => {
    const withUsersTable = createTable(
      createSchema("PG Schema", {
        id: "11111111-1111-4111-8111-111111111111",
        now: new Date("2026-08-15T09:00:00.000Z"),
        dialect: "postgresql",
      }),
      "users",
      { id: "22222222-2222-4222-8222-222222222222", now: new Date("2026-08-15T09:00:00.000Z") },
    );
    const withCreatedAtColumn = addColumn(
      withUsersTable,
      "22222222-2222-4222-8222-222222222222",
      { ...columnFields, name: "created_at", type: "TIMESTAMP", precision: "3" },
      { id: "33333333-3333-4333-8333-333333333333", now: new Date("2026-08-15T09:00:00.000Z") },
    );
    const withUniqueKey = addKey(
      withCreatedAtColumn,
      "22222222-2222-4222-8222-222222222222",
      { type: "UNIQUE", columnIds: ["33333333-3333-4333-8333-333333333333"] },
      { id: "44444444-4444-4444-8444-444444444444", now: new Date("2026-08-15T09:00:00.000Z") },
    );
    const withPostsTable = createTable(withUniqueKey, "posts", {
      id: "55555555-5555-4555-8555-555555555555",
      now: new Date("2026-08-15T09:00:00.000Z"),
    });

    const updated = addForeignKeyWithNewColumn(
      withPostsTable,
      "55555555-5555-4555-8555-555555555555",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      {
        columnId: "66666666-6666-4666-8666-666666666666",
        now: new Date("2026-08-15T09:00:00.000Z"),
      },
    );

    expect(getTable(updated, "55555555-5555-4555-8555-555555555555").columns.at(-1)).toMatchObject({
      type: "TIMESTAMP",
      size: "",
      precision: "3",
    });
  });
});

describe("removeForeignKey", () => {
  const original = addForeignKey(
    buildTwoTableSchema(),
    POSTS_TABLE_ID,
    {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    },
    { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("removes the matching foreign key and bumps updatedAt", () => {
    const updated = removeForeignKey(original, POSTS_TABLE_ID, POSTS_FOREIGN_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("is a no-op when the owning table id is unknown", () => {
    const updated = removeForeignKey(original, "unknown-id", POSTS_FOREIGN_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("is a no-op when the foreign key id is unknown", () => {
    const updated = removeForeignKey(original, POSTS_TABLE_ID, "unknown-id", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    removeForeignKey(original, POSTS_TABLE_ID, POSTS_FOREIGN_KEY_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(original, POSTS_TABLE_ID).foreignKeys).toHaveLength(1);
  });
});

describe("REQ-021: foreign keys never dangle after table/column deletion", () => {
  const withForeignKey = addForeignKey(
    buildTwoTableSchema(),
    POSTS_TABLE_ID,
    {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    },
    { id: POSTS_FOREIGN_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("removeTable strips foreign keys on other tables that referenced the removed table", () => {
    const updated = removeTable(withForeignKey, USERS_TABLE_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([]);
  });

  it("removeTables strips foreign keys on remaining tables that referenced a removed table", () => {
    const updated = removeTables(withForeignKey, [USERS_TABLE_ID], {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([]);
  });

  it("removeColumn strips a foreign key when its own (child) column is removed", () => {
    const updated = removeColumn(withForeignKey, POSTS_TABLE_ID, POSTS_USER_ID_COLUMN_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([]);
  });

  it("removeColumn strips a foreign key on another table when its referenced column is removed", () => {
    const updated = removeColumn(withForeignKey, USERS_TABLE_ID, USERS_ID_COLUMN_ID, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(getTable(updated, POSTS_TABLE_ID).foreignKeys).toEqual([]);
  });
});
