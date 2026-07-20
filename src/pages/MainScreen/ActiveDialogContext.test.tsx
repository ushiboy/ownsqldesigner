import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActiveDialogProvider, useActiveDialog } from "./ActiveDialogContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ActiveDialogProvider>{children}</ActiveDialogProvider>
);

describe("ActiveDialogContext", () => {
  it("starts with no dialog open", () => {
    const { result } = renderHook(() => useActiveDialog(), { wrapper });

    expect(result.current.activeDialog).toBeNull();
  });

  it("opens and closes a dialog", () => {
    const { result } = renderHook(() => useActiveDialog(), { wrapper });

    act(() => {
      result.current.openDialog("renameSchema");
    });
    expect(result.current.activeDialog).toBe("renameSchema");

    act(() => {
      result.current.closeDialog();
    });
    expect(result.current.activeDialog).toBeNull();
  });

  it("replaces the open dialog when another is opened", () => {
    const { result } = renderHook(() => useActiveDialog(), { wrapper });

    act(() => {
      result.current.openDialog("createSchema");
    });
    act(() => {
      result.current.openDialog("deleteSchema");
    });

    expect(result.current.activeDialog).toBe("deleteSchema");
  });

  it("seeds the initial dialog for stories and tests", () => {
    const { result } = renderHook(() => useActiveDialog(), {
      wrapper: ({ children }) => (
        <ActiveDialogProvider initialDialog="deleteSchema">{children}</ActiveDialogProvider>
      ),
    });

    expect(result.current.activeDialog).toBe("deleteSchema");
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useActiveDialog())).toThrow(
      "useActiveDialog must be used within an ActiveDialogProvider",
    );
  });
});
