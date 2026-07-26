import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  addColumn,
  addForeignKey,
  addKey,
  createSchema,
  createTable,
} from "../../../domain/schema";
import type { SchemaRepository } from "../../../domain/schemaRepository";
import { createFakeSchemaRepository } from "../../../test/fakeSchemaRepository";
import { NotificationProvider, useNotification } from "../NotificationContext";
import { useSchemaWorkspace } from "./useSchemaWorkspace";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

/** Renders the workspace hook together with the notification context it feeds. */
function renderWorkspace(repository: SchemaRepository) {
  return renderHook(
    () => ({ workspace: useSchemaWorkspace(repository), notification: useNotification() }),
    { wrapper },
  );
}

describe("useSchemaWorkspace", () => {
  it("restores the last-edited schema on startup", async () => {
    const schema = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({
      schemas: [schema],
      lastSchemaId: schema.id,
    });

    const { result } = renderWorkspace(repository);

    await waitFor(() => {
      expect(result.current.workspace.currentSchema).toEqual(schema);
    });
  });

  it("auto-creates and persists a blank default schema on first visit", async () => {
    const repository = createFakeSchemaRepository();

    const { result } = renderWorkspace(repository);

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.name).toBe("New Schema");
    });
    const created = result.current.workspace.currentSchema;
    await waitFor(async () => {
      expect(await repository.loadLastSchemaId()).toBe(created?.id);
    });
    expect(await repository.load(created?.id ?? "")).toEqual(created);
    expect(created?.tables).toEqual([]);
  });

  it("auto-creates a blank schema when the last-edited pointer dangles", async () => {
    const repository = createFakeSchemaRepository({ lastSchemaId: "dangling-id" });

    const { result } = renderWorkspace(repository);

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.name).toBe("New Schema");
    });
    expect(result.current.workspace.currentSchema?.id).not.toBe("dangling-id");
  });

  it("lists saved schemas sorted by name", async () => {
    const orders = createSchema("Orders");
    const accounts = createSchema("Accounts");
    const repository = createFakeSchemaRepository({
      schemas: [orders, accounts],
      lastSchemaId: orders.id,
    });

    const { result } = renderWorkspace(repository);

    await waitFor(() => {
      expect(result.current.workspace.savedSchemas.map((summary) => summary.name)).toEqual([
        "Accounts",
        "Orders",
      ]);
    });
  });

  it("creates, persists, and switches to a new schema via createSchema", async () => {
    const existing = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({
      schemas: [existing],
      lastSchemaId: existing.id,
    });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.createSchema("Orders");
    });

    await waitFor(() => {
      expect(result.current.workspace.savedSchemas.map((summary) => summary.name)).toEqual([
        "Blog Schema",
        "Orders",
      ]);
    });
    expect(result.current.workspace.currentSchema?.name).toBe("Orders");
    expect(await repository.loadLastSchemaId()).toBe(result.current.workspace.currentSchema?.id);
  });

  it("switches to a selected schema without bumping its updatedAt", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const shop = createSchema("Shop Schema", { now: new Date("2026-07-02T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({
      schemas: [blog, shop],
      lastSchemaId: blog.id,
    });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(blog.id);
    });

    act(() => {
      result.current.workspace.selectSchema(shop.id);
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(shop.id);
    });
    await waitFor(async () => {
      expect(await repository.loadLastSchemaId()).toBe(shop.id);
    });
    expect((await repository.load(shop.id))?.updatedAt).toEqual(
      new Date("2026-07-02T09:00:00.000Z"),
    );
  });

  it("keeps the current schema and reports a failed selection", async () => {
    const blog = createSchema("Blog Schema");
    const shop = createSchema("Shop Schema");
    const repository = createFakeSchemaRepository({
      schemas: [blog, shop],
      lastSchemaId: blog.id,
    });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.savedSchemas).toHaveLength(2);
    });
    // The entry vanishes behind the workspace's back (e.g. another tab).
    await repository.remove(shop.id);

    act(() => {
      result.current.workspace.selectSchema(shop.id);
    });

    await waitFor(() => {
      expect(result.current.notification.notification).toBe(
        'Could not load "Shop Schema". It may have been deleted or corrupted.',
      );
    });
    expect(result.current.workspace.currentSchema?.id).toBe(blog.id);
    expect(result.current.workspace.savedSchemas.map((summary) => summary.name)).toEqual([
      "Blog Schema",
    ]);
  });

  it("clears a stale notification on the next successful selection", async () => {
    const blog = createSchema("Blog Schema");
    const shop = createSchema("Shop Schema");
    const repository = createFakeSchemaRepository({
      schemas: [blog, shop],
      lastSchemaId: blog.id,
    });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.savedSchemas).toHaveLength(2);
    });
    act(() => {
      result.current.workspace.selectSchema("missing-id");
    });
    await waitFor(() => {
      expect(result.current.notification.notification).not.toBeNull();
    });

    act(() => {
      result.current.workspace.selectSchema(shop.id);
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(shop.id);
    });
    expect(result.current.notification.notification).toBeNull();
  });

  it("renames the current schema, bumps updatedAt, and persists it", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.renameSchema("Journal Schema");
    });

    await waitFor(() => {
      expect(result.current.workspace.savedSchemas.map((summary) => summary.name)).toEqual([
        "Journal Schema",
      ]);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.name).toBe("Journal Schema");
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
    expect(persisted?.createdAt).toEqual(blog.createdAt);
  });

  it("treats renaming to the unchanged name as a no-op", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.renameSchema("Blog Schema");
    });

    expect(result.current.workspace.currentSchema?.updatedAt).toEqual(blog.updatedAt);
  });

  it("deletes the current schema and switches to the most-recently-updated one", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-03T09:00:00.000Z") });
    const older = createSchema("Older Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const newer = createSchema("Newer Schema", { now: new Date("2026-07-02T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({
      schemas: [blog, older, newer],
      lastSchemaId: blog.id,
    });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(blog.id);
    });

    act(() => {
      result.current.workspace.deleteCurrentSchema();
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(newer.id);
    });
    expect(await repository.load(blog.id)).toBeNull();
    await waitFor(() => {
      expect(result.current.workspace.savedSchemas.map((summary) => summary.name)).toEqual([
        "Newer Schema",
        "Older Schema",
      ]);
    });
    await waitFor(async () => {
      expect(await repository.loadLastSchemaId()).toBe(newer.id);
    });
  });

  it("auto-creates a blank default schema when the last schema is deleted", async () => {
    const blog = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(blog.id);
    });

    act(() => {
      result.current.workspace.deleteCurrentSchema();
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.name).toBe("New Schema");
    });
    expect(result.current.workspace.currentSchema?.id).not.toBe(blog.id);
    expect(await repository.load(blog.id)).toBeNull();
    const created = result.current.workspace.currentSchema;
    await waitFor(async () => {
      expect(await repository.load(created?.id ?? "")).toEqual(created);
    });
  });

  it("creates and persists a table on the current schema via createTable", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.createTable("posts");
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables.map((table) => table.name)).toEqual([
        "posts",
      ]);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables).toEqual(result.current.workspace.currentSchema?.tables);
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("renames a table, bumps updatedAt, and persists it", async () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.renameTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "articles");
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.name).toBe("articles");
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.name).toBe("articles");
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("treats renaming a table to the unchanged name as a no-op", async () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.renameTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", "posts");
    });

    expect(result.current.workspace.currentSchema?.updatedAt).toEqual(blog.updatedAt);
  });

  it("updates a table's comment, bumps updatedAt, and persists it", async () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.updateTableComment(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "Blog posts",
      );
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.comment).toBe("Blog posts");
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.comment).toBe("Blog posts");
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("moves a table, bumps updatedAt, and persists it", async () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.moveTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", {
        x: 400,
        y: 300,
      });
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.position).toEqual({
        x: 400,
        y: 300,
      });
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.position).toEqual({ x: 400, y: 300 });
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("treats moving a table to its unchanged position as a no-op", async () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });
    const originalPosition = result.current.workspace.currentSchema?.tables[0]?.position;

    act(() => {
      result.current.workspace.moveTable(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        originalPosition ?? { x: 0, y: 0 },
      );
    });

    expect(result.current.workspace.currentSchema?.updatedAt).toEqual(blog.updatedAt);
  });

  it("removes a table, bumps updatedAt, and persists it", async () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.removeTable("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables).toEqual([]);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables).toEqual([]);
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
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

  it("adds a column to a table, bumps updatedAt, and persists it", async () => {
    const blog = createTable(
      createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") }),
      "posts",
      { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.addColumn("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", columnFields);
    });

    await waitFor(() => {
      expect(
        result.current.workspace.currentSchema?.tables[0]?.columns.map((column) => column.name),
      ).toEqual(["title"]);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.columns).toEqual(
      result.current.workspace.currentSchema?.tables[0]?.columns,
    );
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("updates a column's fields, bumps updatedAt, and persists it", async () => {
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
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.updateColumn(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
        { ...columnFields, name: "heading", nullable: false },
      );
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.columns[0]?.name).toBe("heading");
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.columns[0]?.name).toBe("heading");
    expect(persisted?.tables[0]?.columns[0]?.nullable).toBe(false);
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("removes a column from a table, bumps updatedAt, and persists it", async () => {
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
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.removeColumn(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      );
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.columns).toEqual([]);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.columns).toEqual([]);
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  const keyFields = {
    type: "UNIQUE" as const,
    columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
  };

  it("adds a key to a table, bumps updatedAt, and persists it", async () => {
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
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.addKey("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", keyFields);
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.keys).toHaveLength(1);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.keys).toEqual(
      result.current.workspace.currentSchema?.tables[0]?.keys,
    );
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("updates a key's fields, bumps updatedAt, and persists it", async () => {
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
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.updateKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
        { type: "INDEX", columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"] },
      );
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.keys[0]?.type).toBe("INDEX");
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.keys[0]?.type).toBe("INDEX");
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("removes a key from a table, bumps updatedAt, and persists it", async () => {
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
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.removeKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      );
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.keys).toEqual([]);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.keys).toEqual([]);
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  const foreignKeyFields = {
    columnId: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
    referencedTableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    referencedColumnId: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
  };

  function buildBlogWithReferenceableColumn() {
    const withUniqueColumn = addKey(
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
    return addColumn(
      withUniqueColumn,
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      { ...columnFields, name: "author_id" },
      { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", now: new Date("2026-07-01T09:00:00.000Z") },
    );
  }

  it("adds a foreign key to a table, bumps updatedAt, and persists it", async () => {
    const blog = buildBlogWithReferenceableColumn();
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.addForeignKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        foreignKeyFields,
      );
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.foreignKeys).toHaveLength(1);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.foreignKeys).toEqual(
      result.current.workspace.currentSchema?.tables[0]?.foreignKeys,
    );
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it("removes a foreign key from a table, bumps updatedAt, and persists it", async () => {
    const blog = addForeignKey(
      buildBlogWithReferenceableColumn(),
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      foreignKeyFields,
      { id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", now: new Date("2026-07-01T09:00:00.000Z") },
    );
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema).not.toBeNull();
    });

    act(() => {
      result.current.workspace.removeForeignKey(
        "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
      );
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.tables[0]?.foreignKeys).toEqual([]);
    });
    const persisted = await repository.load(blog.id);
    expect(persisted?.tables[0]?.foreignKeys).toEqual([]);
    expect(persisted?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });
});
