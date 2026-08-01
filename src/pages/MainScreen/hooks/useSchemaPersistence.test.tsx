import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { createSchema, type Schema } from "../../../domain/schema";
import type { SchemaRepository } from "../../../domain/schemaRepository";
import { createFakeSchemaRepository } from "../../../test/fakeSchemaRepository";
import { NotificationProvider, useNotification } from "../NotificationContext";
import { useSchemaPersistence } from "./useSchemaPersistence";

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

/** Renders the hook behind a minimal harness that stands in for useUndoableSchema:
 * `setCurrentSchema` plays the role of `replaceSchema`, so the hook can be exercised
 * without pulling in the editing hook it's normally composed with. */
function renderPersistence(repository: SchemaRepository, seededSchema?: Schema) {
  return renderHook(
    () => {
      const [currentSchema, setCurrentSchema] = useState<Schema | null>(seededSchema ?? null);
      const persistence = useSchemaPersistence(
        repository,
        currentSchema,
        seededSchema,
        setCurrentSchema,
      );
      const notification = useNotification();
      return { persistence, currentSchema, setCurrentSchema, notification };
    },
    { wrapper },
  );
}

describe("useSchemaPersistence", () => {
  it("restores the last-edited schema on startup", async () => {
    const schema = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({
      schemas: [schema],
      lastSchemaId: schema.id,
    });

    const { result } = renderPersistence(repository);

    await waitFor(() => {
      expect(result.current.currentSchema).toEqual(schema);
    });
  });

  it("auto-creates and persists a blank default schema on first visit", async () => {
    const repository = createFakeSchemaRepository();

    const { result } = renderPersistence(repository);

    await waitFor(() => {
      expect(result.current.currentSchema?.name).toBe("New Schema");
    });
    const created = result.current.currentSchema;
    await waitFor(async () => {
      expect(await repository.loadLastSchemaId()).toBe(created?.id);
    });
    expect(await repository.load(created?.id ?? "")).toEqual(created);
    expect(created?.tables).toEqual([]);
  });

  it("auto-creates a blank schema when the last-edited pointer dangles", async () => {
    const repository = createFakeSchemaRepository({ lastSchemaId: "dangling-id" });

    const { result } = renderPersistence(repository);

    await waitFor(() => {
      expect(result.current.currentSchema?.name).toBe("New Schema");
    });
    expect(result.current.currentSchema?.id).not.toBe("dangling-id");
  });

  it("lists saved schemas sorted by name", async () => {
    const orders = createSchema("Orders");
    const accounts = createSchema("Accounts");
    const repository = createFakeSchemaRepository({
      schemas: [orders, accounts],
      lastSchemaId: orders.id,
    });

    const { result } = renderPersistence(repository);

    await waitFor(() => {
      expect(result.current.persistence.savedSchemas.map((summary) => summary.name)).toEqual([
        "Accounts",
        "Orders",
      ]);
    });
  });

  it("marks unsaved changes and notifies when an autosave attempt fails", async () => {
    const blog = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderPersistence(repository, blog);
    await waitFor(() => {
      expect(result.current.persistence.savedSchemas).toHaveLength(1);
    });
    vi.spyOn(repository, "save").mockRejectedValueOnce(new Error("quota exceeded"));

    act(() => {
      result.current.setCurrentSchema(createSchema("Blog v2", { id: blog.id }));
    });

    await waitFor(() => {
      expect(result.current.persistence.hasUnsavedChanges).toBe(true);
    });
    expect(result.current.notification.notification).toBe(
      "Could not save your changes. Leaving this page may lose them.",
    );
    expect(await repository.load(blog.id)).toEqual(blog);
  });

  it("clears the unsaved-changes flag once a later save succeeds", async () => {
    const blog = createSchema("Blog Schema");
    const repository = createFakeSchemaRepository({ schemas: [blog], lastSchemaId: blog.id });
    const { result } = renderPersistence(repository, blog);
    await waitFor(() => {
      expect(result.current.persistence.savedSchemas).toHaveLength(1);
    });
    vi.spyOn(repository, "save").mockRejectedValueOnce(new Error("quota exceeded"));
    act(() => {
      result.current.setCurrentSchema(createSchema("Blog v2", { id: blog.id }));
    });
    await waitFor(() => {
      expect(result.current.persistence.hasUnsavedChanges).toBe(true);
    });

    act(() => {
      result.current.setCurrentSchema(createSchema("Blog v3", { id: blog.id }));
    });

    await waitFor(() => {
      expect(result.current.persistence.hasUnsavedChanges).toBe(false);
    });
  });

  it("keeps the current schema and reports a failed selection", async () => {
    const blog = createSchema("Blog Schema");
    const shop = createSchema("Shop Schema");
    const repository = createFakeSchemaRepository({
      schemas: [blog, shop],
      lastSchemaId: blog.id,
    });
    const { result } = renderPersistence(repository, blog);
    await waitFor(() => {
      expect(result.current.persistence.savedSchemas).toHaveLength(2);
    });
    // The entry vanishes behind the workspace's back (e.g. another tab).
    await repository.remove(shop.id);

    act(() => {
      result.current.persistence.selectSchema(shop.id);
    });

    await waitFor(() => {
      expect(result.current.notification.notification).toBe(
        'Could not load "Shop Schema". It may have been deleted or corrupted.',
      );
    });
    expect(result.current.currentSchema?.id).toBe(blog.id);
    expect(result.current.persistence.savedSchemas.map((summary) => summary.name)).toEqual([
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
    const { result } = renderPersistence(repository, blog);
    await waitFor(() => {
      expect(result.current.persistence.savedSchemas).toHaveLength(2);
    });
    act(() => {
      result.current.persistence.selectSchema("missing-id");
    });
    await waitFor(() => {
      expect(result.current.notification.notification).not.toBeNull();
    });

    act(() => {
      result.current.persistence.selectSchema(shop.id);
    });

    await waitFor(() => {
      expect(result.current.currentSchema?.id).toBe(shop.id);
    });
    expect(result.current.notification.notification).toBeNull();
  });

  it("switches to a selected schema without bumping its updatedAt", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const shop = createSchema("Shop Schema", { now: new Date("2026-07-02T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({
      schemas: [blog, shop],
      lastSchemaId: blog.id,
    });
    const { result } = renderPersistence(repository, blog);

    act(() => {
      result.current.persistence.selectSchema(shop.id);
    });

    await waitFor(() => {
      expect(result.current.currentSchema?.id).toBe(shop.id);
    });
    await waitFor(async () => {
      expect(await repository.loadLastSchemaId()).toBe(shop.id);
    });
    expect((await repository.load(shop.id))?.updatedAt).toEqual(
      new Date("2026-07-02T09:00:00.000Z"),
    );
  });

  it("deletes the current schema and switches to the most-recently-updated one", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-03T09:00:00.000Z") });
    const older = createSchema("Older Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const newer = createSchema("Newer Schema", { now: new Date("2026-07-02T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({
      schemas: [blog, older, newer],
      lastSchemaId: blog.id,
    });
    const { result } = renderPersistence(repository, blog);

    act(() => {
      result.current.persistence.deleteCurrentSchema();
    });

    await waitFor(() => {
      expect(result.current.currentSchema?.id).toBe(newer.id);
    });
    expect(await repository.load(blog.id)).toBeNull();
    await waitFor(() => {
      expect(result.current.persistence.savedSchemas.map((summary) => summary.name)).toEqual([
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
    const { result } = renderPersistence(repository, blog);

    act(() => {
      result.current.persistence.deleteCurrentSchema();
    });

    await waitFor(() => {
      expect(result.current.currentSchema?.name).toBe("New Schema");
    });
    expect(result.current.currentSchema?.id).not.toBe(blog.id);
    expect(await repository.load(blog.id)).toBeNull();
    const created = result.current.currentSchema;
    await waitFor(async () => {
      expect(await repository.load(created?.id ?? "")).toEqual(created);
    });
  });
});
