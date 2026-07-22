import {
  addColumn,
  createSchema,
  createTable,
  moveTable,
  removeColumn,
  renameSchema,
  renameTable,
  schemaSchema,
  updateColumn,
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
      },
      {
        id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
        name: "comments",
        comment: "",
        position: { x: 260, y: 0 },
        columns: [],
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

const columnFields = {
  name: "title",
  type: "TEXT" as const,
  size: "",
  defaultValue: "",
  nullable: true,
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
});
