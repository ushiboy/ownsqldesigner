import { act, renderHook, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { Schema } from "../../../domain/schema";
import { createFakeSchemaRepository } from "../../../test/fakeSchemaRepository";
import { type DialogKind, ActiveDialogProvider } from "../ActiveDialogContext";
import { CanvasApiProvider } from "../CanvasApiContext";
import { NotificationProvider } from "../NotificationContext";
import {
  SchemaWorkspaceProvider,
  useCurrentSchema,
  useSchemaActions,
} from "../SchemaWorkspaceContext";
import { SelectionProvider } from "../SelectionContext";
import { useUndoRedoShortcut } from "./useUndoRedoShortcut";

const blogSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

function renderShortcut(initialDialog: DialogKind | null = null) {
  const repository = createFakeSchemaRepository({
    schemas: [blogSchema],
    lastSchemaId: blogSchema.id,
  });
  return renderHook(
    () => {
      useUndoRedoShortcut();
      return { currentSchema: useCurrentSchema(), actions: useSchemaActions() };
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NotificationProvider>
          <SchemaWorkspaceProvider repository={repository} initialSchema={blogSchema}>
            <SelectionProvider>
              <CanvasApiProvider>
                <ActiveDialogProvider initialDialog={initialDialog}>
                  {children}
                </ActiveDialogProvider>
              </CanvasApiProvider>
            </SelectionProvider>
          </SchemaWorkspaceProvider>
        </NotificationProvider>
      ),
    },
  );
}

describe("useUndoRedoShortcut", () => {
  it("undoes the last edit on Ctrl+Z", async () => {
    const { result } = renderShortcut();
    act(() => {
      result.current.actions.createTable("posts");
    });
    await waitFor(() => expect(result.current.currentSchema?.tables).toHaveLength(1));

    await userEvent.keyboard("{Control>}z{/Control}");

    expect(result.current.currentSchema?.tables).toEqual([]);
  });

  it("redoes an undone edit on Ctrl+Shift+Z", async () => {
    const { result } = renderShortcut();
    act(() => {
      result.current.actions.createTable("posts");
    });
    await waitFor(() => expect(result.current.currentSchema?.tables).toHaveLength(1));
    await userEvent.keyboard("{Control>}z{/Control}");
    await waitFor(() => expect(result.current.currentSchema?.tables).toEqual([]));

    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");

    expect(result.current.currentSchema?.tables.map((table) => table.name)).toEqual(["posts"]);
  });

  it("does nothing while another dialog is open", async () => {
    const { result } = renderShortcut("createTable");
    act(() => {
      result.current.actions.createTable("posts");
    });
    await waitFor(() => expect(result.current.currentSchema?.tables).toHaveLength(1));

    await userEvent.keyboard("{Control>}z{/Control}");

    expect(result.current.currentSchema?.tables).toHaveLength(1);
  });

  it("ignores the shortcut while focus is in a text field", async () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const { result } = renderShortcut();
    act(() => {
      result.current.actions.createTable("posts");
    });
    await waitFor(() => expect(result.current.currentSchema?.tables).toHaveLength(1));

    await userEvent.keyboard("{Control>}z{/Control}");

    expect(result.current.currentSchema?.tables).toHaveLength(1);
    input.remove();
  });

  it("stops listening after unmount", async () => {
    const { result, unmount } = renderShortcut();
    act(() => {
      result.current.actions.createTable("posts");
    });
    await waitFor(() => expect(result.current.currentSchema?.tables).toHaveLength(1));
    unmount();

    await userEvent.keyboard("{Control>}z{/Control}");

    expect(result.current.currentSchema?.tables).toHaveLength(1);
  });
});
