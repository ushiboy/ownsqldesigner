import { addColumn, removeColumn, updateColumn } from "./column";
import { addForeignKey } from "./foreignKey";
import { addKey } from "./key";
import {
  COMMENTS_POST_USER_ID_COLUMN_ID,
  COMMENTS_TABLE_ID,
  CYCLE_COL_A_ID,
  CYCLE_COL_A_KEY_ID,
  CYCLE_COL_B_ID,
  CYCLE_COL_B_KEY_ID,
  CYCLE_X_TABLE_ID,
  CYCLE_Y_TABLE_ID,
  POSTS_TABLE_ID,
  POSTS_USER_ID_COLUMN_ID,
  POSTS_USER_ID_KEY_ID,
  USERS_ID_COLUMN_ID,
  USERS_TABLE_ID,
  buildTwoTableSchema,
  columnFields,
  getTable,
} from "./test-fixtures";
import { createSchema, createTable } from "./table";
import { schemaSchema } from "./types";

describe("addColumn", () => {
  const original = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "posts",
    { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("appends a column to the matching table and bumps updatedAt", () => {
    const updated = addColumn(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields, {
      id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated.tables[0]?.columns).toEqual([
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", ...columnFields },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("appends to existing columns without touching them", () => {
    const withFirst = addColumn(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields, {
      id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });
    const withSecond = addColumn(
      withFirst,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "body", type: "TEXT" },
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-20T09:00:00.000Z") },
    );

    expect(withSecond.tables[0]?.columns).toEqual([
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", ...columnFields },
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", ...columnFields, name: "body" },
    ]);
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = addColumn(original, "unknown-id", columnFields, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    addColumn(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields, {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(original.tables[0]?.columns).toEqual([]);
  });

  it("produces a document that passes runtime validation", () => {
    const table = createTable(createSchema("Blog Schema"), "posts");
    const tableId = table.tables[0]?.id ?? "";

    const updated = addColumn(table, tableId, columnFields);

    expect(schemaSchema.safeParse(updated).success).toBe(true);
  });

  it("is a no-op when the name is not a valid identifier", () => {
    const updated = addColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "1title" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the name is already used by another column, case-insensitively", () => {
    const withFirst = addColumn(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields, {
      id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    const updated = addColumn(
      withFirst,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "Title" },
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-20T09:00:00.000Z") },
    );

    expect(updated).toBe(withFirst);
  });
});

describe("updateColumn", () => {
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

  it("replaces the matching column's fields and bumps updatedAt", () => {
    const updated = updateColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "heading", nullable: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns).toEqual([
      {
        id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
        ...columnFields,
        name: "heading",
        nullable: false,
      },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("leaves other columns untouched", () => {
    const withSecond = addColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "subtitle" },
      {
        id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
        now: new Date("2026-07-18T09:00:00.000Z"),
      },
    );

    const updated = updateColumn(
      withSecond,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "heading" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns[1]).toEqual({
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      ...columnFields,
      name: "subtitle",
    });
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = updateColumn(
      original,
      "unknown-id",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      columnFields,
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the column id is unknown", () => {
    const updated = updateColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "unknown-id",
      columnFields,
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    updateColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "heading" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(original.tables[0]?.columns[0]?.name).toBe("title");
  });

  it("is a no-op when the name is not a valid identifier", () => {
    const updated = updateColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "1heading" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(original);
  });

  it("is a no-op when the name is already used by another column, case-insensitively", () => {
    const withSecond = addColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "subtitle" },
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const updated = updateColumn(
      withSecond,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, name: "Subtitle" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated).toBe(withSecond);
  });

  it("allows renaming a column to its own current name", () => {
    const updated = updateColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { ...columnFields, comment: "Post title" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns[0]).toEqual({
      id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      ...columnFields,
      comment: "Post title",
    });
  });
});

describe("removeColumn", () => {
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

  it("removes the matching column and bumps updatedAt", () => {
    const updated = removeColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns).toEqual([]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("leaves other columns untouched", () => {
    const withSecond = addColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "subtitle" },
      {
        id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
        now: new Date("2026-07-18T09:00:00.000Z"),
      },
    );

    const updated = removeColumn(
      withSecond,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns).toEqual([
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", ...columnFields, name: "subtitle" },
    ]);
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = removeColumn(original, "unknown-id", "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("is a no-op when the column id is unknown", () => {
    const updated = removeColumn(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "unknown-id", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    removeColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(original.tables[0]?.columns).toHaveLength(1);
  });

  it("drops the removed column from composite keys, removing keys left with no columns", () => {
    const withSecondColumn = addColumn(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      {
        ...columnFields,
        name: "body",
      },
      {
        id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
        now: new Date("2026-07-18T09:00:00.000Z"),
      },
    );
    const withCompositeKey = addKey(
      withSecondColumn,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      {
        type: "INDEX",
        columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d"],
      },
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
    );

    const withOneColumnRemoved = removeColumn(
      withCompositeKey,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(withOneColumnRemoved.tables[0]?.keys).toEqual([
      {
        id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
        type: "INDEX",
        columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
      },
    ]);

    const withBothColumnsRemoved = removeColumn(
      withOneColumnRemoved,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { now: new Date("2026-07-20T09:00:00.000Z") },
    );

    expect(withBothColumnsRemoved.tables[0]?.keys).toEqual([]);
  });
});

describe("REQ-017: updateColumn propagates type changes to foreign-key children", () => {
  it("propagates a type change to a directly linked FK child column", () => {
    const withForeignKey = addForeignKey(buildTwoTableSchema(), POSTS_TABLE_ID, {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });

    const updated = updateColumn(
      withForeignKey,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { ...columnFields, name: "id", type: "REAL" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(
      getTable(updated, POSTS_TABLE_ID).columns.find((c) => c.id === POSTS_USER_ID_COLUMN_ID),
    ).toMatchObject({ type: "REAL" });
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("propagates transitively through a chain of foreign keys", () => {
    const withUsersPostsFk = addForeignKey(buildTwoTableSchema(), POSTS_TABLE_ID, {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });
    const withPostsUserIdUnique = addKey(
      withUsersPostsFk,
      POSTS_TABLE_ID,
      { type: "UNIQUE", columnIds: [POSTS_USER_ID_COLUMN_ID] },
      { id: POSTS_USER_ID_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withCommentsTable = createTable(withPostsUserIdUnique, "comments", {
      id: COMMENTS_TABLE_ID,
      now: new Date("2026-07-18T09:00:00.000Z"),
    });
    const original = addForeignKey(
      addColumn(
        withCommentsTable,
        COMMENTS_TABLE_ID,
        { ...columnFields, name: "post_user_id" },
        { id: COMMENTS_POST_USER_ID_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      COMMENTS_TABLE_ID,
      {
        columnId: COMMENTS_POST_USER_ID_COLUMN_ID,
        referencedTableId: POSTS_TABLE_ID,
        referencedColumnId: POSTS_USER_ID_COLUMN_ID,
      },
    );

    const updated = updateColumn(
      original,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { ...columnFields, name: "id", type: "REAL" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(
      getTable(updated, POSTS_TABLE_ID).columns.find((c) => c.id === POSTS_USER_ID_COLUMN_ID),
    ).toMatchObject({ type: "REAL" });
    expect(
      getTable(updated, COMMENTS_TABLE_ID).columns.find(
        (c) => c.id === COMMENTS_POST_USER_ID_COLUMN_ID,
      ),
    ).toMatchObject({ type: "REAL" });
  });

  it("terminates when propagation forms a reference cycle across two tables", () => {
    const withXTable = createTable(
      createSchema("Cycle Schema", {
        id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
        now: new Date("2026-07-18T09:00:00.000Z"),
      }),
      "x",
      { id: CYCLE_X_TABLE_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withColAPrimaryKey = addKey(
      addColumn(
        withXTable,
        CYCLE_X_TABLE_ID,
        { ...columnFields, name: "col_a", type: "INTEGER" },
        { id: CYCLE_COL_A_ID, now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      CYCLE_X_TABLE_ID,
      { type: "PRIMARY_KEY", columnIds: [CYCLE_COL_A_ID] },
      { id: CYCLE_COL_A_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withYTable = createTable(withColAPrimaryKey, "y", {
      id: CYCLE_Y_TABLE_ID,
      now: new Date("2026-07-18T09:00:00.000Z"),
    });
    const withColBUnique = addKey(
      addColumn(
        withYTable,
        CYCLE_Y_TABLE_ID,
        { ...columnFields, name: "col_b", type: "INTEGER" },
        { id: CYCLE_COL_B_ID, now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      CYCLE_Y_TABLE_ID,
      { type: "UNIQUE", columnIds: [CYCLE_COL_B_ID] },
      { id: CYCLE_COL_B_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const withYtoXForeignKey = addForeignKey(withColBUnique, CYCLE_Y_TABLE_ID, {
      columnId: CYCLE_COL_B_ID,
      referencedTableId: CYCLE_X_TABLE_ID,
      referencedColumnId: CYCLE_COL_A_ID,
    });
    const original = addForeignKey(withYtoXForeignKey, CYCLE_X_TABLE_ID, {
      columnId: CYCLE_COL_A_ID,
      referencedTableId: CYCLE_Y_TABLE_ID,
      referencedColumnId: CYCLE_COL_B_ID,
    });

    const updated = updateColumn(
      original,
      CYCLE_X_TABLE_ID,
      CYCLE_COL_A_ID,
      { ...columnFields, name: "col_a", type: "TEXT" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(
      getTable(updated, CYCLE_X_TABLE_ID).columns.find((c) => c.id === CYCLE_COL_A_ID),
    ).toMatchObject({ type: "TEXT" });
    expect(
      getTable(updated, CYCLE_Y_TABLE_ID).columns.find((c) => c.id === CYCLE_COL_B_ID),
    ).toMatchObject({ type: "TEXT" });
  });

  it("does not touch other tables when the column's type does not change", () => {
    const withForeignKey = addForeignKey(buildTwoTableSchema(), POSTS_TABLE_ID, {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });
    const postsBefore = getTable(withForeignKey, POSTS_TABLE_ID);

    const updated = updateColumn(
      withForeignKey,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { ...columnFields, name: "id", type: "INTEGER", nullable: false },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, POSTS_TABLE_ID)).toBe(postsBefore);
  });

  it("does not affect other tables when there is no foreign key relationship", () => {
    const original = buildTwoTableSchema();
    const postsBefore = getTable(original, POSTS_TABLE_ID);

    const updated = updateColumn(
      original,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { ...columnFields, name: "id", type: "REAL" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(getTable(updated, POSTS_TABLE_ID)).toBe(postsBefore);
  });

  it("does not mutate the input schema when propagating a type change", () => {
    const original = addForeignKey(buildTwoTableSchema(), POSTS_TABLE_ID, {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });

    updateColumn(
      original,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { ...columnFields, name: "id", type: "REAL" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(
      getTable(original, POSTS_TABLE_ID).columns.find((c) => c.id === POSTS_USER_ID_COLUMN_ID),
    ).toMatchObject({ type: "TEXT" });
  });
});
