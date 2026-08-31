import { tv } from "tailwind-variants";

export const menuBox = tv({
  base: "absolute top-full left-0 z-50 mt-1 w-56 rounded-md border border-edge bg-surface py-1 shadow-card",
});

export const menuItem = tv({
  base: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-heading transition-colors hover:bg-accent-bg disabled:opacity-40",
});
