import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

type UseMenuRovingFocusOptions = {
  itemCount: number;
  initialIndex?: number;
  onClose: () => void;
};

type UseMenuRovingFocusResult = {
  activeIndex: number;
  getItemTabIndex: (index: number) => 0 | -1;
  registerItemRef: (index: number) => (element: HTMLButtonElement | null) => void;
  onMenuKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export function useMenuRovingFocus({
  itemCount,
  initialIndex = 0,
  onClose,
}: UseMenuRovingFocusOptions): UseMenuRovingFocusResult {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Move focus into the menu on open (APG menu pattern), instead of leaving
  // it on the trigger button.
  useEffect(() => {
    itemRefs.current[initialIndex]?.focus();
  }, [initialIndex]);

  function focusItem(index: number) {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(nextItemIndex(activeIndex, itemCount));
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(previousItemIndex(activeIndex, itemCount));
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(itemCount - 1);
        break;
      case "Tab":
        onClose();
        break;
    }
  }

  return {
    activeIndex,
    getItemTabIndex: (index) => (index === activeIndex ? 0 : -1),
    registerItemRef: (index) => (element) => {
      itemRefs.current[index] = element;
    },
    onMenuKeyDown,
  };
}

function nextItemIndex(current: number, count: number): number {
  return (current + 1) % count;
}

function previousItemIndex(current: number, count: number): number {
  return (current - 1 + count) % count;
}
