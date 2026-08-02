import { renderHook } from "@testing-library/react";
import { useEscapeKey } from "./useEscapeKey";

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

function pressOtherKey() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
}

describe("useEscapeKey", () => {
  it("calls the callback when Escape is pressed", () => {
    const onEscape = vi.fn<() => void>();
    renderHook(() => useEscapeKey(onEscape));

    pressEscape();

    expect(onEscape).toHaveBeenCalledOnce();
  });

  it("does not call the callback for other keys", () => {
    const onEscape = vi.fn<() => void>();
    renderHook(() => useEscapeKey(onEscape));

    pressOtherKey();

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("stops listening after unmount", () => {
    const onEscape = vi.fn<() => void>();
    const { unmount } = renderHook(() => useEscapeKey(onEscape));

    unmount();
    pressEscape();

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("uses the latest callback after a re-render", () => {
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    const { rerender } = renderHook(({ onEscape }) => useEscapeKey(onEscape), {
      initialProps: { onEscape: first },
    });

    rerender({ onEscape: second });
    pressEscape();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
