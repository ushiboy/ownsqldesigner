import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Schema } from "../../../domain/schema";
import { createFakeSchemaRepository } from "../../../test/fakeSchemaRepository";
import { NotificationProvider } from "../NotificationContext";
import { SchemaWorkspaceProvider, useSchemaActions } from "../SchemaWorkspaceContext";
import { type InitialSelection, SelectionProvider, useSelection } from "../SelectionContext";
import { useUndoRedo } from "./useUndoRedo";

const blogSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

const seededSelection: InitialSelection = { tableIds: ["a-table-id"] };

/** clearSelection is deferred (twice) past undo/redo — see useUndoRedo.ts. */
async function flushDeferredClearSelection() {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 210));
  });
}

function renderUndoRedo() {
  const repository = createFakeSchemaRepository({
    schemas: [blogSchema],
    lastSchemaId: blogSchema.id,
  });
  return renderHook(
    () => ({
      undoRedo: useUndoRedo(),
      actions: useSchemaActions(),
      selection: useSelection(),
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NotificationProvider>
          <SchemaWorkspaceProvider repository={repository} initialSchema={blogSchema}>
            <SelectionProvider initialSelection={seededSelection}>{children}</SelectionProvider>
          </SchemaWorkspaceProvider>
        </NotificationProvider>
      ),
    },
  );
}

describe("useUndoRedo", () => {
  it("reports canUndo/canRedo from the workspace history", () => {
    const { result } = renderUndoRedo();

    expect(result.current.undoRedo.canUndo).toBe(false);
    expect(result.current.undoRedo.canRedo).toBe(false);
  });

  it("undoes the last edit and clears selection", async () => {
    const { result } = renderUndoRedo();
    act(() => {
      result.current.actions.createTable("posts");
    });
    expect(result.current.selection.selectedTableIds).toEqual(new Set(["a-table-id"]));

    act(() => {
      result.current.undoRedo.undo();
    });
    await flushDeferredClearSelection();

    expect(result.current.selection.selectedTableIds).toEqual(new Set());
    expect(result.current.undoRedo.canRedo).toBe(true);
  });

  it("redoes an undone edit and clears selection", async () => {
    const { result } = renderUndoRedo();
    act(() => {
      result.current.actions.createTable("posts");
    });
    act(() => {
      result.current.undoRedo.undo();
    });
    await flushDeferredClearSelection();
    act(() => {
      result.current.selection.selectTable("a-table-id");
    });

    act(() => {
      result.current.undoRedo.redo();
    });
    await flushDeferredClearSelection();

    expect(result.current.selection.selectedTableIds).toEqual(new Set());
    expect(result.current.undoRedo.canUndo).toBe(true);
  });

  it("does not clear selection when there is nothing to undo", async () => {
    const { result } = renderUndoRedo();

    act(() => {
      result.current.undoRedo.undo();
    });
    await flushDeferredClearSelection();

    expect(result.current.selection.selectedTableIds).toEqual(new Set(["a-table-id"]));
  });

  it("does not clear selection when there is nothing to redo", async () => {
    const { result } = renderUndoRedo();

    act(() => {
      result.current.undoRedo.redo();
    });
    await flushDeferredClearSelection();

    expect(result.current.selection.selectedTableIds).toEqual(new Set(["a-table-id"]));
  });
});
