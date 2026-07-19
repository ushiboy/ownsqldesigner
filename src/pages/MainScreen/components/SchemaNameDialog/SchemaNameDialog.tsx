import { tv } from "tailwind-variants";
import { useSchemaNameDialog } from "./useSchemaNameDialog";

const overlay = tv({
  base: "fixed inset-0 z-50 flex items-center justify-center bg-black/40",
});

const dialogBox = tv({
  // `static m-0` neutralizes the browser's default centered-absolute dialog
  // styles so the overlay's flexbox does the centering instead.
  base: "static m-0 w-96 rounded-lg border border-edge bg-surface p-6 text-body shadow-card",
});

const nameInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

const actionButton = tv({
  base: "rounded-md px-3 py-1.5 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  variants: {
    variant: {
      primary: "bg-accent-bg text-accent hover:brightness-95 disabled:opacity-40",
      secondary: "text-heading hover:bg-accent-bg",
    },
  },
});

type SchemaNameDialogProps = {
  open: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

export function SchemaNameDialog({ open, onSubmit, onCancel }: SchemaNameDialogProps) {
  if (!open) {
    return null;
  }
  return <SchemaNameDialogPanel onSubmit={onSubmit} onCancel={onCancel} />;
}

type SchemaNameDialogPanelProps = {
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

// Mounted only while the dialog is open, so the input state resets each time.
function SchemaNameDialogPanel({ onSubmit, onCancel }: SchemaNameDialogPanelProps) {
  const { name, trimmedName, setName } = useSchemaNameDialog({ onCancel });

  return (
    <div className={overlay()}>
      {/* Statically-open <dialog> (no showModal(): jsdom doesn't implement
          it); the overlay supplies the backdrop and centering instead. */}
      <dialog
        open
        aria-modal="true"
        aria-labelledby="schema-name-dialog-title"
        className={dialogBox()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(trimmedName);
          }}
        >
          <h2 id="schema-name-dialog-title" className="text-[16px]">
            New Schema
          </h2>
          <label className="mt-4 block text-[14px]">
            Schema name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              className={nameInput()}
            />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={actionButton({ variant: "secondary" })}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={trimmedName === ""}
              className={actionButton({ variant: "primary" })}
            >
              Create
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
