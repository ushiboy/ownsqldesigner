import {
  addColumn,
  addForeignKey,
  addForeignKeyWithNewColumn,
  addKey,
  createSchema,
  createTable,
  getColumnKeyMembership,
  getColumnKeyMembershipDisabled,
  getReferenceableColumns,
  isColumnNameAvailable,
  isNameTaken,
  isReferenceableColumn,
  isTableNameAvailable,
  isValidIdentifierName,
  moveTable,
  removeColumn,
  removeForeignKey,
  removeKey,
  removeTable,
  renameSchema,
  renameTable,
  type Schema,
  schemaSchema,
  setColumnKeyMembership,
  updateColumn,
  updateKey,
  updateTableComment,
} from "./schema";

describe("createSchema", () => {
  it("creates a blank schema with the given name", () => {
    const schema = createSchema("Blog Schema");

    expect(schema.name).toBe("Blog Schema");
    expect(schema.tables).toEqual([]);
  });

  it("generates a unique id per schema", () => {
    const first = createSchema("First");
    const second = createSchema("Second");

    expect(first.id).not.toBe(second.id);
  });

  it("uses the injected id and time when provided", () => {
    const schema = createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    expect(schema.id).toBe("c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01");
    expect(schema.createdAt).toEqual(new Date("2026-07-18T09:00:00.000Z"));
  });

  it("sets createdAt and updatedAt to the same instant", () => {
    const schema = createSchema("Blog Schema");

    expect(schema.updatedAt).toBe(schema.createdAt);
  });

  it("produces a document that passes runtime validation", () => {
    const schema = createSchema("Blog Schema");

    expect(schemaSchema.safeParse(schema).success).toBe(true);
  });
});

describe("renameSchema", () => {
  const original = createSchema("Blog Schema", {
    id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
    now: new Date("2026-07-18T09:00:00.000Z"),
  });

  it("updates the name and bumps updatedAt to the injected time", () => {
    const renamed = renameSchema(original, "Shop Schema", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed.name).toBe("Shop Schema");
    expect(renamed.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("preserves id, createdAt, and tables", () => {
    const renamed = renameSchema(original, "Shop Schema", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed.id).toBe(original.id);
    expect(renamed.createdAt).toEqual(original.createdAt);
    expect(renamed.tables).toEqual(original.tables);
  });

  it("does not mutate the input schema", () => {
    renameSchema(original, "Shop Schema", { now: new Date("2026-07-19T09:00:00.000Z") });

    expect(original.name).toBe("Blog Schema");
    expect(original.updatedAt).toEqual(new Date("2026-07-18T09:00:00.000Z"));
  });
});

describe("createTable", () => {
  const original = createSchema("Blog Schema", {
    id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
    now: new Date("2026-07-18T09:00:00.000Z"),
  });

  it("appends a table with a blank comment, a default position, and bumps updatedAt", () => {
    const updated = createTable(original, "posts", {
      id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated.tables).toEqual([
      {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        name: "posts",
        comment: "",
        position: { x: 0, y: 0 },
        columns: [],
        keys: [],
        foreignKeys: [],
      },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("appends to existing tables without touching them, advancing the grid position", () => {
    const withFirst = createTable(original, "posts", {
      id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });
    const withSecond = createTable(withFirst, "comments", {
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      now: new Date("2026-07-20T09:00:00.000Z"),
    });

    expect(withSecond.tables).toEqual([
      {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        name: "posts",
        comment: "",
        position: { x: 0, y: 0 },
        columns: [],
        keys: [],
        foreignKeys: [],
      },
      {
        id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
        name: "comments",
        comment: "",
        position: { x: 260, y: 0 },
        columns: [],
        keys: [],
        foreignKeys: [],
      },
    ]);
  });

  it("does not mutate the input schema", () => {
    createTable(original, "posts", { now: new Date("2026-07-19T09:00:00.000Z") });

    expect(original.tables).toEqual([]);
  });

  it("produces a document that passes runtime validation", () => {
    const updated = createTable(original, "posts");

    expect(schemaSchema.safeParse(updated).success).toBe(true);
  });

  it("is a no-op when the name is not a valid identifier", () => {
    const updated = createTable(original, "1posts", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("is a no-op when the name is already used by another table, case-insensitively", () => {
    const withFirst = createTable(original, "posts", {
      id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    const updated = createTable(withFirst, "Posts", {
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      now: new Date("2026-07-20T09:00:00.000Z"),
    });

    expect(updated).toBe(withFirst);
  });
});

describe("renameTable", () => {
  const original = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "posts",
    { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("updates the matching table's name and bumps updatedAt", () => {
    const renamed = renameTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "articles", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed.tables).toEqual([
      {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        name: "articles",
        comment: "",
        position: { x: 0, y: 0 },
        columns: [],
        keys: [],
        foreignKeys: [],
      },
    ]);
    expect(renamed.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("leaves other tables untouched", () => {
    const withSecond = createTable(original, "comments", {
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    const renamed = renameTable(withSecond, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "articles", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed.tables[1]).toEqual({
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      name: "comments",
      comment: "",
      position: { x: 260, y: 0 },
      columns: [],
      keys: [],
      foreignKeys: [],
    });
  });

  it("is a no-op when the table id is unknown", () => {
    const renamed = renameTable(original, "unknown-id", "articles", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed).toBe(original);
  });

  it("does not mutate the input schema", () => {
    renameTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "articles", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(original.tables[0]?.name).toBe("posts");
  });

  it("is a no-op when the name is not a valid identifier", () => {
    const renamed = renameTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "1articles", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed).toBe(original);
  });

  it("is a no-op when the name is already used by another table, case-insensitively", () => {
    const withSecond = createTable(original, "comments", {
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    const renamed = renameTable(withSecond, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "Comments", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed).toBe(withSecond);
  });

  it("allows renaming a table to its own current name", () => {
    const renamed = renameTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "posts", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed.tables[0]?.name).toBe("posts");
    expect(renamed.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });
});

describe("updateTableComment", () => {
  const original = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "posts",
    { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("updates the matching table's comment and bumps updatedAt", () => {
    const updated = updateTableComment(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "Blog posts",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables).toEqual([
      {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        name: "posts",
        comment: "Blog posts",
        position: { x: 0, y: 0 },
        columns: [],
        keys: [],
        foreignKeys: [],
      },
    ]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = updateTableComment(original, "unknown-id", "Blog posts", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    updateTableComment(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "Blog posts", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(original.tables[0]?.comment).toBe("");
  });
});

describe("moveTable", () => {
  const original = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "posts",
    { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("updates the matching table's position and bumps updatedAt", () => {
    const moved = moveTable(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { x: 400, y: 300 },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(moved.tables).toEqual([
      {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        name: "posts",
        comment: "",
        position: { x: 400, y: 300 },
        columns: [],
        keys: [],
        foreignKeys: [],
      },
    ]);
    expect(moved.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("leaves other tables untouched", () => {
    const withSecond = createTable(original, "comments", {
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    const moved = moveTable(
      withSecond,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { x: 400, y: 300 },
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(moved.tables[1]).toEqual({
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      name: "comments",
      comment: "",
      position: { x: 260, y: 0 },
      columns: [],
      keys: [],
      foreignKeys: [],
    });
  });

  it("is a no-op when the table id is unknown", () => {
    const moved = moveTable(
      original,
      "unknown-id",
      { x: 400, y: 300 },
      {
        now: new Date("2026-07-19T09:00:00.000Z"),
      },
    );

    expect(moved).toBe(original);
  });

  it("does not mutate the input schema", () => {
    moveTable(
      original,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { x: 400, y: 300 },
      {
        now: new Date("2026-07-19T09:00:00.000Z"),
      },
    );

    expect(original.tables[0]?.position).toEqual({ x: 0, y: 0 });
  });
});

describe("removeTable", () => {
  const original = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "posts",
    { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("removes the matching table and bumps updatedAt", () => {
    const updated = removeTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated.tables).toEqual([]);
    expect(updated.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("leaves other tables untouched", () => {
    const withSecond = createTable(original, "comments", {
      id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    const updated = removeTable(withSecond, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated.tables).toEqual([
      {
        id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
        name: "comments",
        comment: "",
        position: { x: 260, y: 0 },
        columns: [],
        keys: [],
        foreignKeys: [],
      },
    ]);
  });

  it("is a no-op when the table id is unknown", () => {
    const updated = removeTable(original, "unknown-id", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(updated).toBe(original);
  });

  it("does not mutate the input schema", () => {
    removeTable(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(original.tables).toHaveLength(1);
  });
});

const columnFields = {
  name: "title",
  type: "TEXT" as const,
  size: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

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

function getTable(schema: Schema, tableId: string) {
  const table = schema.tables.find((t) => t.id === tableId);
  if (table === undefined) {
    throw new Error(`expected a table with id ${tableId}`);
  }
  return table;
}

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

  it("is all false when the table has no keys yet", () => {
    expect(
      getColumnKeyMembershipDisabled(
        getTable(withTwoColumns, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12"),
        "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      ),
    ).toEqual({ PRIMARY_KEY: false, UNIQUE: false, INDEX: false });
  });

  it("disables PRIMARY_KEY (including for a not-yet-created column) once another column holds it", () => {
    const withPrimaryKey = addKey(
      withTwoColumns,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { type: "PRIMARY_KEY", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-18T09:00:00.000Z") },
    );
    const table = getTable(withPrimaryKey, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");

    expect(getColumnKeyMembershipDisabled(table, null).PRIMARY_KEY).toBe(true);
    expect(
      getColumnKeyMembershipDisabled(table, "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d").PRIMARY_KEY,
    ).toBe(true);
    expect(
      getColumnKeyMembershipDisabled(table, "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c").PRIMARY_KEY,
    ).toBe(false);
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
      getColumnKeyMembershipDisabled(table, "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c").UNIQUE,
    ).toBe(true);
    expect(
      getColumnKeyMembershipDisabled(table, "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c").INDEX,
    ).toBe(false);
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

const USERS_TABLE_ID = "11111111-1111-4111-8111-111111111111";
const USERS_ID_COLUMN_ID = "22222222-2222-4222-8222-222222222222";
const USERS_ID_KEY_ID = "33333333-3333-4333-8333-333333333333";
const USERS_EMAIL_COLUMN_ID = "44444444-4444-4444-8444-444444444444";
const POSTS_TABLE_ID = "55555555-5555-4555-8555-555555555555";
const POSTS_USER_ID_COLUMN_ID = "66666666-6666-4666-8666-666666666666";
const POSTS_FOREIGN_KEY_ID = "77777777-7777-4777-8777-777777777777";
const POSTS_NEW_COLUMN_ID = "88888888-8888-4888-8888-888888888888";
const POSTS_NEW_FOREIGN_KEY_ID = "99999999-9999-4999-8999-999999999999";
const POSTS_USER_ID_KEY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMMENTS_TABLE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COMMENTS_POST_USER_ID_COLUMN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CYCLE_X_TABLE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CYCLE_COL_A_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CYCLE_COL_A_KEY_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const CYCLE_Y_TABLE_ID = "12121212-1212-4121-8121-121212121212";
const CYCLE_COL_B_ID = "23232323-2323-4232-8232-232323232323";
const CYCLE_COL_B_KEY_ID = "34343434-3434-4343-8343-343434343434";

function buildTwoTableSchema(): Schema {
  const withUsersTable = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "users",
    { id: USERS_TABLE_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withUsersIdColumn = addColumn(
    withUsersTable,
    USERS_TABLE_ID,
    { ...columnFields, name: "id", type: "INTEGER" },
    { id: USERS_ID_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withUsersEmailColumn = addColumn(
    withUsersIdColumn,
    USERS_TABLE_ID,
    { ...columnFields, name: "email" },
    { id: USERS_EMAIL_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withUsersPrimaryKey = addKey(
    withUsersEmailColumn,
    USERS_TABLE_ID,
    { type: "PRIMARY_KEY", columnIds: [USERS_ID_COLUMN_ID] },
    { id: USERS_ID_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withPostsTable = createTable(withUsersPrimaryKey, "posts", {
    id: POSTS_TABLE_ID,
    now: new Date("2026-07-18T09:00:00.000Z"),
  });
  return addColumn(
    withPostsTable,
    POSTS_TABLE_ID,
    { ...columnFields, name: "user_id" },
    { id: POSTS_USER_ID_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
}

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

describe("isValidIdentifierName", () => {
  it("accepts a name starting with a letter or underscore, made only of letters/digits/underscores", () => {
    expect(isValidIdentifierName("users")).toBe(true);
    expect(isValidIdentifierName("_users")).toBe(true);
    expect(isValidIdentifierName("user_2")).toBe(true);
  });

  it("rejects a name starting with a digit", () => {
    expect(isValidIdentifierName("2users")).toBe(false);
  });

  it("rejects a name containing a space or symbol", () => {
    expect(isValidIdentifierName("user name")).toBe(false);
    expect(isValidIdentifierName("user-name")).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(isValidIdentifierName("")).toBe(false);
  });
});

describe("isNameTaken", () => {
  it("is true for an exact match", () => {
    expect(isNameTaken("users", ["posts", "users"])).toBe(true);
  });

  it("is true for a case-insensitive match", () => {
    expect(isNameTaken("Users", ["posts", "users"])).toBe(true);
  });

  it("is false when no existing name matches", () => {
    expect(isNameTaken("comments", ["posts", "users"])).toBe(false);
  });
});

describe("isTableNameAvailable", () => {
  const schema = buildTwoTableSchema();

  it("is true for a valid, unused name", () => {
    expect(isTableNameAvailable(schema, "comments")).toBe(true);
  });

  it("is false for a name already used by another table, case-insensitively", () => {
    expect(isTableNameAvailable(schema, "Posts")).toBe(false);
  });

  it("is false for an invalid identifier shape", () => {
    expect(isTableNameAvailable(schema, "1comments")).toBe(false);
  });

  it("is true for a table's own current name when excluded", () => {
    expect(isTableNameAvailable(schema, "posts", POSTS_TABLE_ID)).toBe(true);
  });
});

describe("isColumnNameAvailable", () => {
  const schema = buildTwoTableSchema();
  const users = getTable(schema, USERS_TABLE_ID);

  it("is true for a valid, unused name", () => {
    expect(isColumnNameAvailable(users, "created_at")).toBe(true);
  });

  it("is false for a name already used by another column, case-insensitively", () => {
    expect(isColumnNameAvailable(users, "Email")).toBe(false);
  });

  it("is false for an invalid identifier shape", () => {
    expect(isColumnNameAvailable(users, "1created_at")).toBe(false);
  });

  it("is true for a column's own current name when excluded", () => {
    expect(isColumnNameAvailable(users, "email", USERS_EMAIL_COLUMN_ID)).toBe(true);
  });
});

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
