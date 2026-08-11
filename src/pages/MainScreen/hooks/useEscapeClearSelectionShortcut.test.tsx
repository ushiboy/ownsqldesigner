import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type DialogKind, ActiveDialogProvider } from "../ActiveDialogContext";
import { useEscapeClearSelectionShortcut } from "./useEscapeClearSelectionShortcut";

const COLUMN_ID = "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12";
const KEY_ID = "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const RELATION_ID = "b2c3d4e5-6f7a-4b8c-9d0e-1f2a3b4c5d6e";

type Selection = {
  hasTableSelection: boolean;
  columnId: string | null;
  keyId: string | null;
  relationId: string | null;
};

function renderShortcut(selection: Selection, initialDialog: DialogKind | null = null) {
  const clearSelection = vi.fn<() => void>();
  renderHook(() => useEscapeClearSelectionShortcut({ ...selection, clearSelection }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ActiveDialogProvider initialDialog={initialDialog}>{children}</ActiveDialogProvider>
    ),
  });
  return clearSelection;
}

describe("useEscapeClearSelectionShortcut", () => {
  it("clears the selection when Escape is pressed with a table selected", async () => {
    const clearSelection = renderShortcut({
      hasTableSelection: true,
      columnId: null,
      keyId: null,
      relationId: null,
    });

    await userEvent.keyboard("{Escape}");

    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("clears the selection when a column, key, or relation is selected", async () => {
    const clearSelection = renderShortcut({
      hasTableSelection: false,
      columnId: COLUMN_ID,
      keyId: KEY_ID,
      relationId: RELATION_ID,
    });

    await userEvent.keyboard("{Escape}");

    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("does nothing when nothing is selected", async () => {
    const clearSelection = renderShortcut({
      hasTableSelection: false,
      columnId: null,
      keyId: null,
      relationId: null,
    });

    await userEvent.keyboard("{Escape}");

    expect(clearSelection).not.toHaveBeenCalled();
  });

  it("does nothing while a dialog is already open", async () => {
    const clearSelection = renderShortcut(
      { hasTableSelection: true, columnId: null, keyId: null, relationId: null },
      "deleteColumn",
    );

    await userEvent.keyboard("{Escape}");

    expect(clearSelection).not.toHaveBeenCalled();
  });

  it("ignores keys other than Escape", async () => {
    const clearSelection = renderShortcut({
      hasTableSelection: true,
      columnId: null,
      keyId: null,
      relationId: null,
    });

    await userEvent.keyboard("{Delete}");

    expect(clearSelection).not.toHaveBeenCalled();
  });

  it("ignores the shortcut while focus is in a text field", async () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const clearSelection = renderShortcut({
      hasTableSelection: true,
      columnId: null,
      keyId: null,
      relationId: null,
    });

    await userEvent.keyboard("{Escape}");

    expect(clearSelection).not.toHaveBeenCalled();
    input.remove();
  });

  it("stops listening after unmount", async () => {
    const clearSelection = vi.fn<() => void>();
    const { unmount } = renderHook(
      () =>
        useEscapeClearSelectionShortcut({
          hasTableSelection: true,
          columnId: null,
          keyId: null,
          relationId: null,
          clearSelection,
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ActiveDialogProvider initialDialog={null}>{children}</ActiveDialogProvider>
        ),
      },
    );
    unmount();

    await userEvent.keyboard("{Escape}");

    expect(clearSelection).not.toHaveBeenCalled();
  });
});
