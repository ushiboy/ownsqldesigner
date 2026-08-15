import {
  addColumn,
  formatColumnType,
  moveColumnDown,
  moveColumnUp,
  removeColumn,
  updateColumn,
} from "./column";
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
  USERS_MANAGER_ID_COLUMN_ID,
  USERS_TABLE_ID,
  buildTwoTableSchema,
  columnFields,
  getTable,
} from "./test-fixtures";
import { createSchema, createTable } from "./table";
import { schemaSchema } from "./types";

describe("formatColumnType", () => {
  it("returns the bare type when size and precision are empty", () => {
    expect(formatColumnType({ type: "TEXT", size: "", precision: "" })).toBe("TEXT");
  });

  it("returns TYPE(size) when size is set", () => {
    expect(formatColumnType({ type: "TEXT", size: "8", precision: "" })).toBe("TEXT(8)");
  });

  it("returns TYPE(precision) when precision is set and size is empty", () => {
    expect(formatColumnType({ type: "TIMESTAMP", size: "", precision: "3" })).toBe("TIMESTAMP(3)");
  });

  it("prefers size over precision when both are somehow set", () => {
    expect(formatColumnType({ type: "TEXT", size: "8", precision: "3" })).toBe("TEXT(8)");
  });
});

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

describe("moveColumnUp / moveColumnDown", () => {
  const withThreeColumns = addColumn(
    addColumn(
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
        { ...columnFields, name: "alpha" },
        { id: "11111111-1111-4111-8111-111111111111", now: new Date("2026-07-18T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "second" },
      { id: "22222222-2222-4222-8222-222222222222", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    { ...columnFields, name: "third" },
    { id: "33333333-3333-4333-8333-333333333333", now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const TABLE_ID = "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12";
  const ALPHA_ID = "11111111-1111-4111-8111-111111111111";
  const SECOND_ID = "22222222-2222-4222-8222-222222222222";
  const THIRD_ID = "33333333-3333-4333-8333-333333333333";

  describe("moveColumnUp", () => {
    it("swaps the column with its predecessor and bumps updatedAt", () => {
      const updated = moveColumnUp(withThreeColumns, TABLE_ID, SECOND_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated.tables[0]?.columns.map((c) => c.name)).toEqual(["second", "alpha", "third"]);
      expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
    });

    it("is a no-op when the column is already first", () => {
      const updated = moveColumnUp(withThreeColumns, TABLE_ID, ALPHA_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated).toBe(withThreeColumns);
    });

    it("is a no-op when the table id is unknown", () => {
      const updated = moveColumnUp(withThreeColumns, "unknown-id", SECOND_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated).toBe(withThreeColumns);
    });

    it("is a no-op when the column id is unknown", () => {
      const updated = moveColumnUp(withThreeColumns, TABLE_ID, "unknown-id", {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated).toBe(withThreeColumns);
    });

    it("does not mutate the input schema", () => {
      moveColumnUp(withThreeColumns, TABLE_ID, SECOND_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(withThreeColumns.tables[0]?.columns.map((c) => c.name)).toEqual([
        "alpha",
        "second",
        "third",
      ]);
    });
  });

  describe("moveColumnDown", () => {
    it("swaps the column with its successor and bumps updatedAt", () => {
      const updated = moveColumnDown(withThreeColumns, TABLE_ID, SECOND_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated.tables[0]?.columns.map((c) => c.name)).toEqual(["alpha", "third", "second"]);
      expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
    });

    it("is a no-op when the column is already last", () => {
      const updated = moveColumnDown(withThreeColumns, TABLE_ID, THIRD_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated).toBe(withThreeColumns);
    });

    it("is a no-op when the table id is unknown", () => {
      const updated = moveColumnDown(withThreeColumns, "unknown-id", SECOND_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated).toBe(withThreeColumns);
    });

    it("is a no-op when the column id is unknown", () => {
      const updated = moveColumnDown(withThreeColumns, TABLE_ID, "unknown-id", {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(updated).toBe(withThreeColumns);
    });

    it("does not mutate the input schema", () => {
      moveColumnDown(withThreeColumns, TABLE_ID, SECOND_ID, {
        now: new Date("2026-07-19T09:00:00.000Z"),
      });

      expect(withThreeColumns.tables[0]?.columns.map((c) => c.name)).toEqual([
        "alpha",
        "second",
        "third",
      ]);
    });
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

  it("terminates when propagation forms a self-reference on the same table", () => {
    const withManagerIdColumn = addColumn(
      buildTwoTableSchema(),
      USERS_TABLE_ID,
      { ...columnFields, name: "manager_id", type: "INTEGER" },
      { id: USERS_MANAGER_ID_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const original = addForeignKey(withManagerIdColumn, USERS_TABLE_ID, {
      columnId: USERS_MANAGER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });

    const updated = updateColumn(
      original,
      USERS_TABLE_ID,
      USERS_ID_COLUMN_ID,
      { ...columnFields, name: "id", type: "REAL" },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(
      getTable(updated, USERS_TABLE_ID).columns.find((c) => c.id === USERS_MANAGER_ID_COLUMN_ID),
    ).toMatchObject({ type: "REAL" });
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

describe("updateColumn normalizes columns to the schema's dialect (0036)", () => {
  it("clears an FK child's now-invalid size when a propagated type change makes it non-sizable (PostgreSQL)", () => {
    const withUsersTable = createTable(
      createSchema("PG Schema", {
        id: "11111111-1111-4111-8111-111111111111",
        now: new Date("2026-08-14T09:00:00.000Z"),
        dialect: "postgresql",
      }),
      "users",
      { id: "22222222-2222-4222-8222-222222222222", now: new Date("2026-08-14T09:00:00.000Z") },
    );
    const withUsersId = addColumn(
      withUsersTable,
      "22222222-2222-4222-8222-222222222222",
      { ...columnFields, name: "id", type: "VARCHAR", size: "255" },
      { id: "33333333-3333-4333-8333-333333333333", now: new Date("2026-08-14T09:00:00.000Z") },
    );
    const withUsersKey = addKey(
      withUsersId,
      "22222222-2222-4222-8222-222222222222",
      { type: "PRIMARY_KEY", columnIds: ["33333333-3333-4333-8333-333333333333"] },
      { id: "44444444-4444-4444-8444-444444444444", now: new Date("2026-08-14T09:00:00.000Z") },
    );
    const withPostsTable = createTable(withUsersKey, "posts", {
      id: "55555555-5555-4555-8555-555555555555",
      now: new Date("2026-08-14T09:00:00.000Z"),
    });
    const withPostsUserId = addColumn(
      withPostsTable,
      "55555555-5555-4555-8555-555555555555",
      { ...columnFields, name: "user_id", type: "VARCHAR", size: "255" },
      { id: "66666666-6666-4666-8666-666666666666", now: new Date("2026-08-14T09:00:00.000Z") },
    );
    const original = addForeignKey(withPostsUserId, "55555555-5555-4555-8555-555555555555", {
      columnId: "66666666-6666-4666-8666-666666666666",
      referencedTableId: "22222222-2222-4222-8222-222222222222",
      referencedColumnId: "33333333-3333-4333-8333-333333333333",
    });

    const updated = updateColumn(
      original,
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      { ...columnFields, name: "id", type: "BOOLEAN" },
      { now: new Date("2026-08-14T10:00:00.000Z") },
    );

    expect(
      getTable(updated, "55555555-5555-4555-8555-555555555555").columns.find(
        (c) => c.id === "66666666-6666-4666-8666-666666666666",
      ),
    ).toMatchObject({ type: "BOOLEAN", size: "" });
  });
});

describe("addColumn normalizes columns to the schema's dialect (0037)", () => {
  const withUsersTable = createTable(
    createSchema("PG Schema", {
      id: "11111111-1111-4111-8111-111111111111",
      now: new Date("2026-08-14T09:00:00.000Z"),
      dialect: "postgresql",
    }),
    "users",
    { id: "22222222-2222-4222-8222-222222222222", now: new Date("2026-08-14T09:00:00.000Z") },
  );

  it("clears size when the given type is not sizable (PostgreSQL), by default", () => {
    const updated = addColumn(
      withUsersTable,
      "22222222-2222-4222-8222-222222222222",
      { ...columnFields, name: "is_active", type: "BOOLEAN", size: "255" },
      { id: "33333333-3333-4333-8333-333333333333", now: new Date("2026-08-14T10:00:00.000Z") },
    );

    expect(
      getTable(updated, "22222222-2222-4222-8222-222222222222").columns.find(
        (c) => c.id === "33333333-3333-4333-8333-333333333333",
      ),
    ).toMatchObject({ type: "BOOLEAN", size: "" });
  });

  it("clears precision when the given type does not support it (PostgreSQL), by default", () => {
    const updated = addColumn(
      withUsersTable,
      "22222222-2222-4222-8222-222222222222",
      { ...columnFields, name: "score", type: "INTEGER", precision: "3" },
      { id: "44444444-4444-4444-8444-444444444444", now: new Date("2026-08-14T10:00:00.000Z") },
    );

    expect(
      getTable(updated, "22222222-2222-4222-8222-222222222222").columns.find(
        (c) => c.id === "44444444-4444-4444-8444-444444444444",
      ),
    ).toMatchObject({ type: "INTEGER", precision: "" });
  });

  it("skips normalization when `normalize: false` is passed", () => {
    const updated = addColumn(
      withUsersTable,
      "22222222-2222-4222-8222-222222222222",
      { ...columnFields, name: "is_active", type: "BOOLEAN", size: "255" },
      {
        id: "55555555-5555-4555-8555-555555555555",
        now: new Date("2026-08-14T10:00:00.000Z"),
        normalize: false,
      },
    );

    expect(
      getTable(updated, "22222222-2222-4222-8222-222222222222").columns.find(
        (c) => c.id === "55555555-5555-4555-8555-555555555555",
      ),
    ).toMatchObject({ type: "BOOLEAN", size: "255" });
  });
});

describe("updateColumn's `normalize` option", () => {
  const withUsersId = addColumn(
    createTable(
      createSchema("PG Schema", {
        id: "11111111-1111-4111-8111-111111111111",
        now: new Date("2026-08-14T09:00:00.000Z"),
        dialect: "postgresql",
      }),
      "users",
      { id: "22222222-2222-4222-8222-222222222222", now: new Date("2026-08-14T09:00:00.000Z") },
    ),
    "22222222-2222-4222-8222-222222222222",
    { ...columnFields, name: "id", type: "INTEGER" },
    { id: "33333333-3333-4333-8333-333333333333", now: new Date("2026-08-14T09:00:00.000Z") },
  );

  it("clears size when the given type is not sizable (PostgreSQL), by default", () => {
    const updated = updateColumn(
      withUsersId,
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      { ...columnFields, name: "is_active", type: "BOOLEAN", size: "255" },
      { now: new Date("2026-08-14T10:00:00.000Z") },
    );

    expect(
      getTable(updated, "22222222-2222-4222-8222-222222222222").columns.find(
        (c) => c.id === "33333333-3333-4333-8333-333333333333",
      ),
    ).toMatchObject({ type: "BOOLEAN", size: "" });
  });

  it("clears precision when the given type does not support it (PostgreSQL), by default", () => {
    const updated = updateColumn(
      withUsersId,
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      { ...columnFields, name: "score", type: "INTEGER", precision: "3" },
      { now: new Date("2026-08-14T10:00:00.000Z") },
    );

    expect(
      getTable(updated, "22222222-2222-4222-8222-222222222222").columns.find(
        (c) => c.id === "33333333-3333-4333-8333-333333333333",
      ),
    ).toMatchObject({ type: "INTEGER", precision: "" });
  });

  it("skips normalization when `normalize: false` is passed", () => {
    const updated = updateColumn(
      withUsersId,
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      { ...columnFields, name: "is_active", type: "BOOLEAN", size: "255" },
      { now: new Date("2026-08-14T10:00:00.000Z"), normalize: false },
    );

    expect(
      getTable(updated, "22222222-2222-4222-8222-222222222222").columns.find(
        (c) => c.id === "33333333-3333-4333-8333-333333333333",
      ),
    ).toMatchObject({ type: "BOOLEAN", size: "255" });
  });
});
