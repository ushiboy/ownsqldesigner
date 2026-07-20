import { tv } from "tailwind-variants";

/** Shared styling for the action buttons in dialog footers. */
export const dialogActionButton = tv({
  base: "rounded-md px-3 py-1.5 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  variants: {
    variant: {
      primary: "bg-accent-bg text-accent hover:brightness-95 disabled:opacity-40",
      secondary: "text-heading hover:bg-accent-bg",
      danger: "bg-danger-bg text-danger hover:brightness-95",
    },
  },
});
