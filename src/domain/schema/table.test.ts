import {
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
import { schemaSchema } from "./types";

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

describe("moveTables", () => {
  const original = createTable(
    createTable(
      createSchema("Blog Schema", {
        id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
        now: new Date("2026-07-18T09:00:00.000Z"),
      }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
    ),
    "comments",
    { id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("updates every matching table's position and bumps updatedAt once", () => {
    const moved = moveTables(
      original,
      [
        { tableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", position: { x: 400, y: 300 } },
        { tableId: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", position: { x: 500, y: 100 } },
      ],
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(moved.tables[0]?.position).toEqual({ x: 400, y: 300 });
    expect(moved.tables[1]?.position).toEqual({ x: 500, y: 100 });
    expect(moved.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("leaves tables not named in the batch untouched", () => {
    const moved = moveTables(
      original,
      [{ tableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", position: { x: 400, y: 300 } }],
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(moved.tables[1]?.position).toEqual({ x: 260, y: 0 });
  });

  it("is a no-op when no move matches an existing table id", () => {
    const moved = moveTables(original, [{ tableId: "unknown-id", position: { x: 400, y: 300 } }], {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(moved).toBe(original);
  });

  it("does not mutate the input schema", () => {
    moveTables(
      original,
      [{ tableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", position: { x: 400, y: 300 } }],
      { now: new Date("2026-07-19T09:00:00.000Z") },
    );

    expect(original.tables[0]?.position).toEqual({ x: 0, y: 0 });
  });
});

describe("restoreSchema", () => {
  const current = createTable(
    renameSchema(
      createSchema("Blog Schema", {
        id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
        now: new Date("2026-07-18T09:00:00.000Z"),
      }),
      "Journal Schema",
      { now: new Date("2026-07-19T09:00:00.000Z") },
    ),
    "comments",
    { id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", now: new Date("2026-07-20T09:00:00.000Z") },
  );
  const snapshot = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "posts",
    { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-18T09:00:00.000Z") },
  );

  it("restores the snapshot's content and bumps updatedAt to the injected time", () => {
    const restored = restoreSchema(current, snapshot, {
      now: new Date("2026-07-21T09:00:00.000Z"),
    });

    expect(restored.tables.map((table) => table.name)).toEqual(["posts"]);
    expect(restored.updatedAt).toEqual(new Date("2026-07-21T09:00:00.000Z"));
  });

  it("keeps the current document's id, name, and createdAt rather than the snapshot's", () => {
    const restored = restoreSchema(current, snapshot, {
      now: new Date("2026-07-21T09:00:00.000Z"),
    });

    expect(restored.id).toBe(current.id);
    expect(restored.name).toBe("Journal Schema");
    expect(restored.createdAt).toEqual(current.createdAt);
  });

  it("does not mutate either input schema", () => {
    restoreSchema(current, snapshot, { now: new Date("2026-07-21T09:00:00.000Z") });

    expect(current.tables.map((table) => table.name)).toEqual(["comments"]);
    expect(snapshot.tables.map((table) => table.name)).toEqual(["posts"]);
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
