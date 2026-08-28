import { fireEvent, render, screen } from "@testing-library/react";
import { useMenuRovingFocus } from "./useMenuRovingFocus";

type MenuHarnessProps = {
  itemCount: number;
  initialIndex?: number;
  onClose: () => void;
};

function MenuHarness({ itemCount, initialIndex, onClose }: MenuHarnessProps) {
  const { getItemTabIndex, registerItemRef, onMenuKeyDown } = useMenuRovingFocus({
    itemCount,
    initialIndex,
    onClose,
  });

  return (
    <div role="menu" tabIndex={-1} onKeyDown={onMenuKeyDown}>
      {Array.from({ length: itemCount }, (_, index) => (
        <button
          key={index}
          type="button"
          ref={registerItemRef(index)}
          tabIndex={getItemTabIndex(index)}
        >
          Item {index}
        </button>
      ))}
    </div>
  );
}

function activeButton() {
  return document.activeElement as HTMLButtonElement;
}

describe("useMenuRovingFocus", () => {
  it("focuses the first item on mount by default", () => {
    render(<MenuHarness itemCount={3} onClose={vi.fn<() => void>()} />);

    expect(activeButton()).toHaveTextContent("Item 0");
  });

  it("focuses the given initial index on mount", () => {
    render(<MenuHarness itemCount={3} initialIndex={1} onClose={vi.fn<() => void>()} />);

    expect(activeButton()).toHaveTextContent("Item 1");
  });

  it("moves focus to the next item on ArrowDown", () => {
    render(<MenuHarness itemCount={3} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "ArrowDown" });

    expect(activeButton()).toHaveTextContent("Item 1");
  });

  it("wraps from the last item to the first on ArrowDown", () => {
    render(<MenuHarness itemCount={3} initialIndex={2} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "ArrowDown" });

    expect(activeButton()).toHaveTextContent("Item 0");
  });

  it("moves focus to the previous item on ArrowUp", () => {
    render(<MenuHarness itemCount={3} initialIndex={1} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "ArrowUp" });

    expect(activeButton()).toHaveTextContent("Item 0");
  });

  it("wraps from the first item to the last on ArrowUp", () => {
    render(<MenuHarness itemCount={3} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "ArrowUp" });

    expect(activeButton()).toHaveTextContent("Item 2");
  });

  it("jumps to the first item on Home", () => {
    render(<MenuHarness itemCount={3} initialIndex={2} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "Home" });

    expect(activeButton()).toHaveTextContent("Item 0");
  });

  it("jumps to the last item on End", () => {
    render(<MenuHarness itemCount={3} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "End" });

    expect(activeButton()).toHaveTextContent("Item 2");
  });

  it("prevents the default action for ArrowDown, ArrowUp, Home, and End", () => {
    render(<MenuHarness itemCount={3} onClose={vi.fn<() => void>()} />);

    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
      const notPrevented = fireEvent.keyDown(activeButton(), { key });
      expect(notPrevented).toBe(false);
    }
  });

  it("calls onClose without preventing the default action on Tab", () => {
    const onClose = vi.fn<() => void>();
    render(<MenuHarness itemCount={3} onClose={onClose} />);

    const notPrevented = fireEvent.keyDown(activeButton(), { key: "Tab" });

    expect(onClose).toHaveBeenCalledOnce();
    expect(notPrevented).toBe(true);
  });

  it("only gives the active item a tabIndex of 0", () => {
    render(<MenuHarness itemCount={3} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "ArrowDown" });

    expect(screen.getByRole("button", { name: "Item 0" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("button", { name: "Item 1" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "Item 2" })).toHaveAttribute("tabindex", "-1");
  });

  it("keeps focus on the only item when there is a single item", () => {
    render(<MenuHarness itemCount={1} onClose={vi.fn<() => void>()} />);

    fireEvent.keyDown(activeButton(), { key: "ArrowDown" });
    expect(activeButton()).toHaveTextContent("Item 0");

    fireEvent.keyDown(activeButton(), { key: "ArrowUp" });
    expect(activeButton()).toHaveTextContent("Item 0");
  });
});
