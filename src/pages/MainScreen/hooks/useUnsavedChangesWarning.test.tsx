import { renderHook } from "@testing-library/react";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

function dispatchBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event;
}

describe("useUnsavedChangesWarning", () => {
  it("prevents the default beforeunload behavior when there are unsaved changes", () => {
    renderHook(() => useUnsavedChangesWarning(true));

    const event = dispatchBeforeUnload();

    // jsdom implements the legacy `returnValue` accessor as a mirror of the
    // canceled flag rather than storing the assigned string, so it reads
    // back as `false` (not `""`) once the handler cancels the event.
    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe(false);
  });

  it("does nothing when there are no unsaved changes", () => {
    renderHook(() => useUnsavedChangesWarning(false));

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
  });

  it("stops warning once the flag clears", () => {
    const { rerender } = renderHook(
      ({ hasUnsavedChanges }) => useUnsavedChangesWarning(hasUnsavedChanges),
      {
        initialProps: { hasUnsavedChanges: true },
      },
    );

    rerender({ hasUnsavedChanges: false });
    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
  });

  it("stops listening after unmount", () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));
    unmount();

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
  });
});
