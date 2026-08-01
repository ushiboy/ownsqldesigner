import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { fn } from "storybook/test";
import type { Schema } from "../../../domain/schema";
import { createFakeSchemaRepository } from "../../../test/fakeSchemaRepository";
import { CanvasApiProvider, useCanvasApiRef } from "../CanvasApiContext";
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
      canvasApiRef: useCanvasApiRef(),
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NotificationProvider>
          <SchemaWorkspaceProvider repository={repository} initialSchema={blogSchema}>
            <SelectionProvider initialSelection={seededSelection}>
              <CanvasApiProvider>{children}</CanvasApiProvider>
            </SelectionProvider>
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

  it("undoes the last edit and clears column/key/relation selection", () => {
    const { result } = renderUndoRedo();
    act(() => {
      result.current.actions.createTable("posts");
      result.current.selection.selectColumn("some-column-id");
    });

    act(() => {
      result.current.undoRedo.undo();
    });

    expect(result.current.selection.selectedColumnId).toBeNull();
    expect(result.current.undoRedo.canRedo).toBe(true);
  });

  it("redoes an undone edit and clears column/key/relation selection", () => {
    const { result } = renderUndoRedo();
    act(() => {
      result.current.actions.createTable("posts");
    });
    act(() => {
      result.current.undoRedo.undo();
    });
    act(() => {
      result.current.selection.selectKey("some-key-id");
    });

    act(() => {
      result.current.undoRedo.redo();
    });

    expect(result.current.selection.selectedKeyId).toBeNull();
    expect(result.current.undoRedo.canUndo).toBe(true);
  });

  it("deselects table nodes through Canvas's imperative API on undo", () => {
    const { result } = renderUndoRedo();
    const deselectAllTables = fn();
    result.current.canvasApiRef.current = { deselectAllTables };
    act(() => {
      result.current.actions.createTable("posts");
    });

    act(() => {
      result.current.undoRedo.undo();
    });

    expect(deselectAllTables).toHaveBeenCalledOnce();
  });

  it("deselects table nodes through Canvas's imperative API on redo", () => {
    const { result } = renderUndoRedo();
    act(() => {
      result.current.actions.createTable("posts");
    });
    act(() => {
      result.current.undoRedo.undo();
    });
    const deselectAllTables = fn();
    result.current.canvasApiRef.current = { deselectAllTables };

    act(() => {
      result.current.undoRedo.redo();
    });

    expect(deselectAllTables).toHaveBeenCalledOnce();
  });

  it("does nothing when there is nothing to undo", () => {
    const { result } = renderUndoRedo();
    const deselectAllTables = fn();
    result.current.canvasApiRef.current = { deselectAllTables };

    act(() => {
      result.current.undoRedo.undo();
    });

    expect(deselectAllTables).not.toHaveBeenCalled();
    expect(result.current.selection.selectedTableIds).toEqual(new Set(["a-table-id"]));
  });

  it("does nothing when there is nothing to redo", () => {
    const { result } = renderUndoRedo();
    const deselectAllTables = fn();
    result.current.canvasApiRef.current = { deselectAllTables };

    act(() => {
      result.current.undoRedo.redo();
    });

    expect(deselectAllTables).not.toHaveBeenCalled();
    expect(result.current.selection.selectedTableIds).toEqual(new Set(["a-table-id"]));
  });
});
