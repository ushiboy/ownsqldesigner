import {
  addColumn,
  addKey,
  createSchema,
  createTable,
  getColumnKeyMembership,
  getColumnKeyMembershipDisabled,
  moveTable,
  removeColumn,
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
      },
      {
        id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
        name: "comments",
        comment: "",
        position: { x: 260, y: 0 },
        columns: [],
        keys: [],
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
    const withSecond = addColumn(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields, {
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

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
    const withSecond = addColumn(original, "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields, {
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    const updated = removeColumn(
      withSecond,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(updated.tables[0]?.columns).toEqual([
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", ...columnFields },
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
