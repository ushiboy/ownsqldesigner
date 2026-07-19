import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type UseToolbarMenuResult = {
  isOpen: boolean;
  wrapperRef: RefObject<HTMLDivElement | null>;
  toggle: () => void;
  close: () => void;
};

export function useToolbarMenu(): UseToolbarMenuResult {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close the menu on any pointer press outside the trigger and the menu.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper !== null && !wrapper.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return {
    isOpen,
    wrapperRef,
    toggle: () => setIsOpen((prev) => !prev),
    close: () => setIsOpen(false),
  };
}
