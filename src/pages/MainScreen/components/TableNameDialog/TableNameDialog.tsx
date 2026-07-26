import { useState } from "react";
import { tv } from "tailwind-variants";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import { isNameTaken, isValidIdentifierName } from "../../../../domain/schema";

const nameInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type TableNameDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialName?: string;
  /** Sibling table names to validate against (REQ-018); caller excludes the table being renamed. */
  existingNames: string[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

export function TableNameDialog({
  open,
  title,
  submitLabel,
  initialName,
  existingNames,
  onSubmit,
  onCancel,
}: TableNameDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <TableNameForm
        submitLabel={submitLabel}
        initialName={initialName ?? ""}
        existingNames={existingNames}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Dialog>
  );
}

type TableNameFormProps = {
  submitLabel: string;
  initialName: string;
  existingNames: string[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

// Mounted only while the dialog is open, so the input state resets each time.
function TableNameForm({
  submitLabel,
  initialName,
  existingNames,
  onSubmit,
  onCancel,
}: TableNameFormProps) {
  const [name, setName] = useState(initialName);
  const trimmedName = name.trim();
  const isEmpty = trimmedName === "";
  const isInvalidShape = !isEmpty && !isValidIdentifierName(trimmedName);
  const isDuplicate = !isEmpty && !isInvalidShape && isNameTaken(trimmedName, existingNames);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(trimmedName);
      }}
    >
      <label className="mt-4 block text-[14px]">
        Table name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          data-autofocus
          className={nameInput()}
        />
      </label>
      {isInvalidShape && (
        <p className="mt-1 text-[12px] text-body">
          Must start with a letter or underscore and contain only letters, digits, and underscores.
        </p>
      )}
      {isDuplicate && (
        <p className="mt-1 text-[12px] text-body">A table with this name already exists.</p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={dialogActionButton({ variant: "secondary" })}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isEmpty || isInvalidShape || isDuplicate}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
