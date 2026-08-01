import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Schema } from "../../domain/schema";
import { createFakeSchemaRepository } from "../../test/fakeSchemaRepository";
import { NotificationProvider } from "./NotificationContext";
import {
  SchemaWorkspaceProvider,
  useCurrentSchema,
  useHasUnsavedChanges,
  useHistoryActions,
  useSavedSchemas,
  useSchemaActions,
} from "./SchemaWorkspaceContext";

const blogSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

function renderWorkspace(initialSchema?: Schema) {
  const repository = createFakeSchemaRepository({
    schemas: [blogSchema],
    lastSchemaId: blogSchema.id,
  });
  const view = renderHook(
    () => ({
      currentSchema: useCurrentSchema(),
      savedSchemas: useSavedSchemas(),
      hasUnsavedChanges: useHasUnsavedChanges(),
      actions: useSchemaActions(),
      history: useHistoryActions(),
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NotificationProvider>
          <SchemaWorkspaceProvider repository={repository} initialSchema={initialSchema}>
            {children}
          </SchemaWorkspaceProvider>
        </NotificationProvider>
      ),
    },
  );
  return { ...view, repository };
}

describe("SchemaWorkspaceContext", () => {
  it("restores the last-edited schema when not seeded", async () => {
    const { result } = renderWorkspace();

    expect(result.current.currentSchema).toBeNull();
    await waitFor(() => expect(result.current.currentSchema?.name).toBe("Blog Schema"));
  });

  it("seeds the schema synchronously for stories and tests", () => {
    const { result } = renderWorkspace(blogSchema);

    expect(result.current.currentSchema).toBe(blogSchema);
  });

  it("does not write an untouched seed back to the repository", async () => {
    const { repository } = renderWorkspace(blogSchema);
    const save = vi.spyOn(repository, "save");

    await waitFor(() => expect(repository.list()).resolves.toHaveLength(1));

    expect(save).not.toHaveBeenCalled();
  });

  it("still exposes the saved schema list when seeded", async () => {
    const { result } = renderWorkspace(blogSchema);

    await waitFor(() => expect(result.current.savedSchemas).toHaveLength(1));
    expect(result.current.savedSchemas[0].name).toBe("Blog Schema");
  });

  it("persists a mutation made on top of a seeded schema", async () => {
    const { result, repository } = renderWorkspace(blogSchema);

    act(() => {
      result.current.actions.createTable("users");
    });

    expect(result.current.currentSchema?.tables).toHaveLength(1);
    await waitFor(async () =>
      expect((await repository.load(blogSchema.id))?.tables).toHaveLength(1),
    );
  });

  it("reports no unsaved changes once the seeded schema settles", async () => {
    const { result } = renderWorkspace(blogSchema);

    await waitFor(() => expect(result.current.savedSchemas).toHaveLength(1));
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useCurrentSchema())).toThrow(
      "Schema workspace hooks must be used within a SchemaWorkspaceProvider",
    );
  });

  it("exposes undo/redo through useHistoryActions", async () => {
    const { result } = renderWorkspace(blogSchema);

    act(() => {
      result.current.actions.createTable("users");
    });
    expect(result.current.history.canUndo).toBe(true);

    act(() => {
      result.current.history.undo();
    });

    expect(result.current.currentSchema?.tables).toEqual([]);
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(true);
  });
});
