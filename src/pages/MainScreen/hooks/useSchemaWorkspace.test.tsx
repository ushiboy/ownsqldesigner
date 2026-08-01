import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createSchema } from "../../../domain/schema";
import type { SchemaRepository } from "../../../domain/schemaRepository";
import { createFakeSchemaRepository } from "../../../test/fakeSchemaRepository";
import { NotificationProvider, useNotification } from "../NotificationContext";
import { useSchemaWorkspace } from "./useSchemaWorkspace";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

/** Renders the composed workspace hook together with the notification context it feeds. */
function renderWorkspace(repository: SchemaRepository) {
  return renderHook(
    () => ({ workspace: useSchemaWorkspace(repository), notification: useNotification() }),
    { wrapper },
  );
}

// useUndoableSchema.test.tsx and useSchemaPersistence.test.tsx cover editing/undo-redo and
// persistence behavior exhaustively in isolation. These tests exist only to confirm the two
// compose correctly through useSchemaWorkspace — the seams where one hook's output feeds the
// other's input (replaceSchema, currentSchema, and the shared NotificationContext).
describe("useSchemaWorkspace", () => {
  it("restores the last-edited schema on startup and exposes it through the composed workspace", async () => {
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

  it("persists an edit made through the editing actions via the composed workspace", async () => {
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

  it("clears a stale notification when loading a schema from a file", async () => {
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
      result.current.workspace.selectSchema("missing-id");
    });
    await waitFor(() => {
      expect(result.current.notification.notification).not.toBeNull();
    });

    act(() => {
      result.current.workspace.loadSchemaFromFile(createSchema("Imported Schema"));
    });

    expect(result.current.notification.notification).toBeNull();
  });

  it("clears history when switching to a different schema", async () => {
    const blog = createSchema("Blog Schema");
    const shop = createSchema("Shop Schema");
    const repository = createFakeSchemaRepository({
      schemas: [blog, shop],
      lastSchemaId: blog.id,
    });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(blog.id);
    });
    act(() => {
      result.current.workspace.createTable("posts");
    });
    await waitFor(() => {
      expect(result.current.workspace.canUndo).toBe(true);
    });

    act(() => {
      result.current.workspace.selectSchema(shop.id);
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(shop.id);
    });
    expect(result.current.workspace.canUndo).toBe(false);
    expect(result.current.workspace.canRedo).toBe(false);
  });

  it("clears history when deleting the current schema", async () => {
    const blog = createSchema("Blog Schema", { now: new Date("2026-07-02T09:00:00.000Z") });
    const older = createSchema("Older Schema", { now: new Date("2026-07-01T09:00:00.000Z") });
    const repository = createFakeSchemaRepository({
      schemas: [blog, older],
      lastSchemaId: blog.id,
    });
    const { result } = renderWorkspace(repository);
    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(blog.id);
    });
    act(() => {
      result.current.workspace.createTable("posts");
    });
    await waitFor(() => {
      expect(result.current.workspace.canUndo).toBe(true);
    });

    act(() => {
      result.current.workspace.deleteCurrentSchema();
    });

    await waitFor(() => {
      expect(result.current.workspace.currentSchema?.id).toBe(older.id);
    });
    expect(result.current.workspace.canUndo).toBe(false);
    expect(result.current.workspace.canRedo).toBe(false);
  });
});
