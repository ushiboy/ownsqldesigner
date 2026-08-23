import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type DialogKind, ActiveDialogProvider, useActiveDialog } from "../ActiveDialogContext";
import { useDeleteKeyShortcut } from "./useDeleteKeyShortcut";

const RELATION_ID = "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

type Selection = {
  hasTableSelection: boolean;
  relationId: string | null;
};

function renderShortcut(selection: Selection, initialDialog: DialogKind | null = null) {
  return renderHook(
    () => {
      useDeleteKeyShortcut(selection);
      return useActiveDialog();
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ActiveDialogProvider initialDialog={initialDialog}>{children}</ActiveDialogProvider>
      ),
    },
  );
}

describe("useDeleteKeyShortcut", () => {
  it("opens the delete table dialog when Delete is pressed with a table selected", async () => {
    const { result } = renderShortcut({ hasTableSelection: true, relationId: null });

    await userEvent.keyboard("{Delete}");

    expect(result.current.activeDialog).toBe("deleteTable");
  });

  it("opens the delete table dialog on Backspace too", async () => {
    const { result } = renderShortcut({ hasTableSelection: true, relationId: null });

    await userEvent.keyboard("{Backspace}");

    expect(result.current.activeDialog).toBe("deleteTable");
  });

  it("opens the delete relation dialog when a relation is selected", async () => {
    const { result } = renderShortcut({ hasTableSelection: false, relationId: RELATION_ID });

    await userEvent.keyboard("{Delete}");

    expect(result.current.activeDialog).toBe("deleteRelation");
  });

  it("prefers the relation dialog when both a table and a relation are selected", async () => {
    const { result } = renderShortcut({ hasTableSelection: true, relationId: RELATION_ID });

    await userEvent.keyboard("{Delete}");

    expect(result.current.activeDialog).toBe("deleteRelation");
  });

  it("does nothing when nothing is selected", async () => {
    const { result } = renderShortcut({ hasTableSelection: false, relationId: null });

    await userEvent.keyboard("{Delete}");

    expect(result.current.activeDialog).toBeNull();
  });

  it("does nothing while another dialog is already open", async () => {
    const { result } = renderShortcut(
      { hasTableSelection: true, relationId: null },
      "deleteColumn",
    );

    await userEvent.keyboard("{Delete}");

    expect(result.current.activeDialog).toBe("deleteColumn");
  });

  it("ignores keys other than Delete and Backspace", async () => {
    const { result } = renderShortcut({ hasTableSelection: true, relationId: null });

    await userEvent.keyboard("{Escape}");

    expect(result.current.activeDialog).toBeNull();
  });

  it("ignores the shortcut while focus is in a text field", async () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const { result } = renderShortcut({ hasTableSelection: true, relationId: null });

    await userEvent.keyboard("{Delete}");

    expect(result.current.activeDialog).toBeNull();
    input.remove();
  });

  it("stops listening after unmount", async () => {
    const { result, unmount } = renderShortcut({ hasTableSelection: true, relationId: null });
    unmount();

    await userEvent.keyboard("{Delete}");

    expect(result.current.activeDialog).toBeNull();
  });
});
