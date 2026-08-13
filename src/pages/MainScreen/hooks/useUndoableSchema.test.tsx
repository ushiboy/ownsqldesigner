import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  addColumn,
  addForeignKey,
  addKey,
  createSchema,
  createTable,
  type Schema,
} from "../../../domain/schema";
import { NotificationProvider, useNotification } from "../NotificationContext";
import { HISTORY_LIMIT, useUndoableSchema } from "./useUndoableSchema";

const columnFields = {
  name: "title",
  type: "TEXT" as const,
  size: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

const keyFields = {
  type: "UNIQUE" as const,
  columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
};

const foreignKeyFields = {
  columnId: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
  referencedTableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
  referencedColumnId: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
};

/** A table with a UNIQUE column another table's foreign key can reference. */
function buildBlogWithReferenceableColumn() {
  const now = new Date("2026-07-01T09:00:00.000Z");
  const withUniqueColumn = addKey(
    addColumn(
      createTable(createSchema("Blog Schema", { now }), "posts", {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        now,
      }),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      columnFields,
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now },
    ),
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    keyFields,
    { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now },
  );
  return addColumn(
    withUniqueColumn,
    "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    { ...columnFields, name: "author_id" },
    { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now },
  );
}

function wrapper(initialNotification?: string | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NotificationProvider initialNotification={initialNotification}>
        {children}
      </NotificationProvider>
    );
  };
}

/** Renders the hook, seeded, together with the notification context it feeds — `currentSchema`
 * is available synchronously from the first render, so no `waitFor` is needed anywhere below. */
function renderUndoableSchema(initialSchema: Schema, initialNotification?: string | null) {
  return renderHook(
    () => ({ editing: useUndoableSchema(initialSchema), notification: useNotification() }),
    { wrapper: wrapper(initialNotification) },
  );
}

describe("useUndoableSchema", () => {
  it("replaces the current schema via createSchema and clears history", () => {
    const { result } = renderUndoableSchema(createSchema("Blog Schema"));
    act(() => {
      result.current.editing.createTable("posts");
    });

    act(() => {
      result.current.editing.createSchema("Orders");
    });

    expect(result.current.editing.currentSchema?.name).toBe("Orders");
    expect(result.current.editing.canUndo).toBe(false);
    expect(result.current.editing.canRedo).toBe(false);
  });

  it("creates the schema with the given dialect, defaulting to sqlite when omitted", () => {
    const { result } = renderUndoableSchema(createSchema("Blog Schema"));

    act(() => {
      result.current.editing.createSchema("Orders", "postgresql");
    });
    expect(result.current.editing.currentSchema?.dialect).toBe("postgresql");

    act(() => {
      result.current.editing.createSchema("Invoices");
    });
    expect(result.current.editing.currentSchema?.dialect).toBe("sqlite");
  });

  it("loads a schema from a file, assigning it a fresh id, and clears history", () => {
    const { result } = renderUndoableSchema(createSchema("Blog Schema"));
    act(() => {
      result.current.editing.createTable("posts");
    });
    const imported = createSchema("Imported Schema", {
      id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    });

    act(() => {
      result.current.editing.loadSchemaFromFile(imported);
    });

    expect(result.current.editing.currentSchema?.name).toBe("Imported Schema");
    expect(result.current.editing.currentSchema?.id).not.toBe(imported.id);
    expect(result.current.editing.canUndo).toBe(false);
    expect(result.current.editing.canRedo).toBe(false);
  });

  it("clears a stale notification when loading a schema from a file", () => {
    const { result } = renderUndoableSchema(createSchema("Blog Schema"), "Could not load schema.");

    act(() => {
      result.current.editing.loadSchemaFromFile(createSchema("Imported Schema"));
    });

    expect(result.current.notification.notification).toBeNull();
  });

  it("renames the current schema and bumps updatedAt", () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.renameSchema("Journal Schema");
    });

    expect(result.current.editing.currentSchema?.name).toBe("Journal Schema");
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("treats renaming to the unchanged name as a no-op", () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.renameSchema("Blog Schema");
    });

    expect(result.current.editing.currentSchema?.updatedAt).toEqual(blog.updatedAt);
  });

  it("creates a table on the current schema via createTable", () => {
    const { result } = renderUndoableSchema(createSchema("Blog Schema"));

    act(() => {
      result.current.editing.createTable("posts");
    });

    expect(result.current.editing.currentSchema?.tables.map((table) => table.name)).toEqual([
      "posts",
    ]);
  });

  it("renames a table and bumps updatedAt", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.renameTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "articles");
    });

    expect(result.current.editing.currentSchema?.tables[0]?.name).toBe("articles");
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("treats renaming a table to the unchanged name as a no-op", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.renameTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "posts");
    });

    expect(result.current.editing.currentSchema?.updatedAt).toEqual(blog.updatedAt);
  });

  it("updates a table's comment and bumps updatedAt", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.updateTableComment(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "Blog posts",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.comment).toBe("Blog posts");
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("moves a table and bumps updatedAt", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.moveTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", { x: 400, y: 300 });
    });

    expect(result.current.editing.currentSchema?.tables[0]?.position).toEqual({ x: 400, y: 300 });
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("treats moving a table to its unchanged position as a no-op", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);
    const originalPosition = result.current.editing.currentSchema?.tables[0]?.position;

    act(() => {
      result.current.editing.moveTable(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        originalPosition ?? { x: 0, y: 0 },
      );
    });

    expect(result.current.editing.currentSchema?.updatedAt).toEqual(blog.updatedAt);
  });

  it("moves a batch of tables in one update", () => {
    const blog = createTable(
      createTable(
        createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "comments",
      { id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.moveTables([
        { tableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", position: { x: 400, y: 300 } },
        { tableId: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", position: { x: 500, y: 100 } },
      ]);
    });

    expect(result.current.editing.currentSchema?.tables[0]?.position).toEqual({
      x: 400,
      y: 300,
    });
    expect(result.current.editing.currentSchema?.tables[1]?.position).toEqual({
      x: 500,
      y: 100,
    });
  });

  it("treats a batch move where every position is unchanged as a no-op", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);
    const originalPosition = result.current.editing.currentSchema?.tables[0]?.position;

    act(() => {
      result.current.editing.moveTables([
        {
          tableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
          position: originalPosition ?? { x: 0, y: 0 },
        },
      ]);
    });

    expect(result.current.editing.currentSchema?.updatedAt).toEqual(blog.updatedAt);
  });

  it("removes a table and bumps updatedAt", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.removeTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");
    });

    expect(result.current.editing.currentSchema?.tables).toEqual([]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("adds a column to a table and bumps updatedAt", () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.addColumn("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields);
    });

    expect(
      result.current.editing.currentSchema?.tables[0]?.columns.map((column) => column.name),
    ).toEqual(["title"]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("updates a column's fields and bumps updatedAt", () => {
    const blog = addColumn(
      createTable(
        createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      columnFields,
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.updateColumn(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
        { ...columnFields, name: "heading", nullable: false },
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.columns[0]?.name).toBe("heading");
    expect(result.current.editing.currentSchema?.tables[0]?.columns[0]?.nullable).toBe(false);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("removes a column from a table and bumps updatedAt", () => {
    const blog = addColumn(
      createTable(
        createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      columnFields,
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.removeColumn(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.columns).toEqual([]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("moves a column up within a table and bumps updatedAt", () => {
    const blog = addColumn(
      addColumn(
        createTable(
          createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
          "posts",
          { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
        ),
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        columnFields,
        { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "subtitle" },
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.moveColumnUp(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      );
    });

    expect(
      result.current.editing.currentSchema?.tables[0]?.columns.map((column) => column.name),
    ).toEqual(["subtitle", "title"]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );

    act(() => {
      result.current.editing.undo();
    });

    expect(
      result.current.editing.currentSchema?.tables[0]?.columns.map((column) => column.name),
    ).toEqual(["title", "subtitle"]);

    act(() => {
      result.current.editing.redo();
    });

    expect(
      result.current.editing.currentSchema?.tables[0]?.columns.map((column) => column.name),
    ).toEqual(["subtitle", "title"]);
  });

  it("moves a column down within a table and bumps updatedAt", () => {
    const blog = addColumn(
      addColumn(
        createTable(
          createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
          "posts",
          { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
        ),
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        columnFields,
        { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "subtitle" },
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.moveColumnDown(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      );
    });

    expect(
      result.current.editing.currentSchema?.tables[0]?.columns.map((column) => column.name),
    ).toEqual(["subtitle", "title"]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("does not push a no-op column move onto the undo stack", () => {
    const blog = addColumn(
      createTable(
        createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      columnFields,
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.moveColumnUp(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      );
    });

    expect(result.current.editing.canUndo).toBe(false);
  });

  it("adds a key to a table and bumps updatedAt", () => {
    const blog = addColumn(
      createTable(
        createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
        "posts",
        { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      columnFields,
      { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.addKey("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", keyFields);
    });

    expect(result.current.editing.currentSchema?.tables[0]?.keys).toHaveLength(1);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("updates a key's fields and bumps updatedAt", () => {
    const blog = addKey(
      addColumn(
        createTable(
          createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
          "posts",
          { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
        ),
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        columnFields,
        { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      keyFields,
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.updateKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
        { type: "INDEX", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.keys[0]?.type).toBe("INDEX");
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("removes a key from a table and bumps updatedAt", () => {
    const blog = addKey(
      addColumn(
        createTable(
          createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
          "posts",
          { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
        ),
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        columnFields,
        { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", now: new Date("2026-07-01T09:00:00.000Z") },
      ),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      keyFields,
      { id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.removeKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.keys).toEqual([]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("removes a key together with the foreign key referencing it, and bumps updatedAt", () => {
    const blog = addForeignKey(
      buildBlogWithReferenceableColumn(),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      foreignKeyFields,
      { now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.removeKeyCascadingForeignKeys(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.keys).toEqual([]);
    expect(result.current.editing.currentSchema?.tables[0]?.foreignKeys).toEqual([]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("adds a foreign key to a table and bumps updatedAt", () => {
    const blog = buildBlogWithReferenceableColumn();
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.addForeignKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        foreignKeyFields,
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.foreignKeys).toHaveLength(1);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("adds a foreign key with a new child column and bumps updatedAt", () => {
    const blog = buildBlogWithReferenceableColumn();
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.addForeignKeyWithNewColumn(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.foreignKeys).toHaveLength(1);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  it("names the generated column via the tableColumn pattern by default", () => {
    const blog = buildBlogWithReferenceableColumn();
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.addForeignKeyWithNewColumn(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.columns.at(-1)?.name).toBe(
      "posts_title",
    );
  });

  it("passes an explicit naming pattern through to the domain layer", () => {
    const blog = buildBlogWithReferenceableColumn();
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.addForeignKeyWithNewColumn(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
        "tableId",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.columns.at(-1)?.name).toBe("posts_id");
  });

  it("removes a foreign key from a table and bumps updatedAt", () => {
    const blog = addForeignKey(
      buildBlogWithReferenceableColumn(),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      foreignKeyFields,
      { id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const { result } = renderUndoableSchema(blog);

    act(() => {
      result.current.editing.removeForeignKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
      );
    });

    expect(result.current.editing.currentSchema?.tables[0]?.foreignKeys).toEqual([]);
    expect(result.current.editing.currentSchema?.updatedAt.getTime()).toBeGreaterThan(
      blog.updatedAt.getTime(),
    );
  });

  describe("undo/redo", () => {
    it("reports nothing to undo or redo for a fresh workspace", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));

      expect(result.current.editing.canUndo).toBe(false);
      expect(result.current.editing.canRedo).toBe(false);
    });

    it("undoes the most recent diagram edit", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });

      act(() => {
        result.current.editing.undo();
      });

      expect(result.current.editing.currentSchema?.tables).toEqual([]);
      expect(result.current.editing.canUndo).toBe(false);
      expect(result.current.editing.canRedo).toBe(true);
    });

    it("redoes an undone edit", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });
      act(() => {
        result.current.editing.undo();
      });

      act(() => {
        result.current.editing.redo();
      });

      expect(result.current.editing.currentSchema?.tables.map((table) => table.name)).toEqual([
        "posts",
      ]);
      expect(result.current.editing.canUndo).toBe(true);
      expect(result.current.editing.canRedo).toBe(false);
    });

    it("is a no-op to undo when there is nothing to undo", () => {
      const blog = createSchema("Blog Schema");
      const { result } = renderUndoableSchema(blog);

      act(() => {
        result.current.editing.undo();
      });

      expect(result.current.editing.currentSchema).toEqual(blog);
    });

    it("is a no-op to redo when there is nothing to redo", () => {
      const blog = createSchema("Blog Schema");
      const { result } = renderUndoableSchema(blog);

      act(() => {
        result.current.editing.redo();
      });

      expect(result.current.editing.currentSchema).toEqual(blog);
    });

    it("does not push a no-op edit onto the undo stack", () => {
      const blog = createTable(createSchema("Blog Schema"), "posts", {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      });
      const { result } = renderUndoableSchema(blog);

      act(() => {
        result.current.editing.renameTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "posts");
      });

      expect(result.current.editing.canUndo).toBe(false);
    });

    it("clears the redo stack once a new edit follows an undo", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });
      act(() => {
        result.current.editing.undo();
      });
      expect(result.current.editing.canRedo).toBe(true);

      act(() => {
        result.current.editing.createTable("comments");
      });

      expect(result.current.editing.canRedo).toBe(false);
      act(() => {
        result.current.editing.redo();
      });
      expect(result.current.editing.currentSchema?.tables.map((table) => table.name)).toEqual([
        "comments",
      ]);
    });

    it("restores a whole group move as a single undo step", () => {
      const blog = createTable(
        createTable(createSchema("Blog Schema"), "posts", {
          id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        }),
        "comments",
        { id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23" },
      );
      const { result } = renderUndoableSchema(blog);
      const originalPositions = blog.tables.map((table) => table.position);

      act(() => {
        result.current.editing.moveTables([
          { tableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", position: { x: 400, y: 300 } },
          { tableId: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", position: { x: 500, y: 100 } },
        ]);
      });

      act(() => {
        result.current.editing.undo();
      });

      expect(result.current.editing.currentSchema?.tables.map((table) => table.position)).toEqual(
        originalPositions,
      );
      expect(result.current.editing.canUndo).toBe(false);
    });

    it("chains two edits dispatched synchronously in the same handler into two undo steps", () => {
      // Mirrors ColumnDialog's "add column, then set its key membership"
      // submit (see DialogHost), which calls both actions back-to-back in
      // one event handler before React re-renders between them.
      const blog = createTable(createSchema("Blog Schema"), "posts", {
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      });
      const { result } = renderUndoableSchema(blog);

      act(() => {
        result.current.editing.addColumn(
          "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
          columnFields,
          "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
        );
        result.current.editing.setColumnKeyMembership(
          "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
          "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
          { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
        );
      });

      expect(result.current.editing.currentSchema?.tables[0]?.keys).toHaveLength(1);
      expect(result.current.editing.currentSchema?.tables[0]?.columns).toHaveLength(1);

      act(() => {
        result.current.editing.undo();
      });
      expect(result.current.editing.currentSchema?.tables[0]?.keys).toEqual([]);
      expect(result.current.editing.currentSchema?.tables[0]?.columns).toHaveLength(1);

      act(() => {
        result.current.editing.undo();
      });
      expect(result.current.editing.currentSchema?.tables[0]?.columns).toEqual([]);
      expect(result.current.editing.canUndo).toBe(false);
    });

    it("keeps the current name across an undo that reaches before a schema rename", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });
      act(() => {
        result.current.editing.renameSchema("Journal Schema");
      });

      act(() => {
        result.current.editing.undo();
      });

      expect(result.current.editing.currentSchema?.tables).toEqual([]);
      expect(result.current.editing.currentSchema?.name).toBe("Journal Schema");
    });

    it("clears history when creating a new schema", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });

      act(() => {
        result.current.editing.createSchema("Orders");
      });

      expect(result.current.editing.canUndo).toBe(false);
      expect(result.current.editing.canRedo).toBe(false);
    });

    it("clears history when loading a schema from a file", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });

      act(() => {
        result.current.editing.loadSchemaFromFile(createSchema("Imported Schema"));
      });

      expect(result.current.editing.canUndo).toBe(false);
      expect(result.current.editing.canRedo).toBe(false);
    });

    it("clears history when the current schema is replaced (as useSchemaPersistence does after a schema switch or delete)", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });
      expect(result.current.editing.canUndo).toBe(true);

      act(() => {
        result.current.editing.replaceSchema(createSchema("Shop Schema"));
      });

      expect(result.current.editing.currentSchema?.name).toBe("Shop Schema");
      expect(result.current.editing.canUndo).toBe(false);
      expect(result.current.editing.canRedo).toBe(false);
    });

    it("does not clear history when renaming the current schema", () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));
      act(() => {
        result.current.editing.createTable("posts");
      });

      act(() => {
        result.current.editing.renameSchema("Journal Schema");
      });

      expect(result.current.editing.canUndo).toBe(true);
    });

    it(`caps the undo stack at ${HISTORY_LIMIT} entries, dropping the oldest`, () => {
      const { result } = renderUndoableSchema(createSchema("Blog Schema"));

      act(() => {
        for (let i = 0; i < HISTORY_LIMIT + 1; i++) {
          result.current.editing.createTable(`table${i}`);
        }
      });

      act(() => {
        for (let i = 0; i < HISTORY_LIMIT; i++) {
          result.current.editing.undo();
        }
      });

      expect(result.current.editing.canUndo).toBe(false);
      expect(result.current.editing.currentSchema?.tables.map((table) => table.name)).toEqual([
        "table0",
      ]);
    });
  });
});
