import { type ReactNode, useEffect, useRef } from "react";
import { tv } from "tailwind-variants";
import { useEscapeKey } from "../../hooks/useEscapeKey";

const overlay = tv({
  base: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
});

const dialogBox = tv({
  // `static m-0` neutralizes the browser's default centered-absolute dialog
  // styles so the overlay's flexbox does the centering instead.
  base: "static m-0 rounded-lg border border-edge bg-surface p-6 text-body shadow-card",
  variants: {
    size: {
      default: "w-96",
      large: "w-[640px] max-w-[90vw]",
    },
  },
});

type DialogSize = "default" | "large";

type DialogProps = {
  open: boolean;
  title: string;
  /** Invoked on Escape; wire it to the same handler as the content's cancel button. */
  onClose: () => void;
  /** Widens the dialog box for content that needs more room, e.g. SQL preview text. */
  size?: DialogSize;
  children: ReactNode;
};

export function Dialog({ open, title, onClose, size = "default", children }: DialogProps) {
  if (!open) {
    return null;
  }
  return (
    <DialogPanel title={title} onClose={onClose} size={size}>
      {children}
    </DialogPanel>
  );
}

type DialogPanelProps = {
  title: string;
  onClose: () => void;
  size: DialogSize;
  children: ReactNode;
};

function DialogPanel({ title, onClose, size, children }: DialogPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Initial focus is imperative rather than an autoFocus attribute: content
  // components are separate from the <dialog> element, so jsx-a11y cannot
  // see the attribute would be inside a dialog and flags it.
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  useEscapeKey(onClose);

  return (
    <div className={overlay()}>
      {/* Statically-open <dialog> (no showModal(): jsdom doesn't implement
          it); the overlay supplies the backdrop and centering instead. */}
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={dialogBox({ size })}
      >
        <h2 id="dialog-title" className="text-[16px]">
          {title}
        </h2>
        {children}
      </dialog>
    </div>
  );
}
