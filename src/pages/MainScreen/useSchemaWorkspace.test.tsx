import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createSchema } from "../../domain/schema";
import type { SchemaRepository } from "../../domain/schemaRepository";
import { createFakeSchemaRepository } from "../../test/fakeSchemaRepository";
import { NotificationProvider, useNotification } from "./NotificationContext";
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
});
