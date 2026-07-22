import { useState } from "react";
import { tv } from "tailwind-variants";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import { type Column, type ColumnType, SQLITE_COLUMN_TYPES } from "../../../../domain/schema";

const fieldInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type ColumnFields = Omit<Column, "id">;

type ColumnDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialColumn?: Column | null;
  onSubmit: (fields: ColumnFields) => void;
  onCancel: () => void;
};

export function ColumnDialog({
  open,
  title,
  submitLabel,
  initialColumn,
  onSubmit,
  onCancel,
}: ColumnDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <ColumnForm
        submitLabel={submitLabel}
        initialColumn={initialColumn ?? null}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Dialog>
  );
}

type ColumnFormProps = {
  submitLabel: string;
  initialColumn: Column | null;
  onSubmit: (fields: ColumnFields) => void;
  onCancel: () => void;
};

const BLANK_COLUMN: ColumnFields = {
  name: "",
  type: "TEXT",
  size: "",
  defaultValue: "",
  nullable: true,
  comment: "",
};

// Mounted only while the dialog is open, so form state resets each time.
function ColumnForm({ submitLabel, initialColumn, onSubmit, onCancel }: ColumnFormProps) {
  const [name, setName] = useState(initialColumn?.name ?? BLANK_COLUMN.name);
  const [type, setType] = useState(initialColumn?.type ?? BLANK_COLUMN.type);
  const [size, setSize] = useState(initialColumn?.size ?? BLANK_COLUMN.size);
  const [defaultValue, setDefaultValue] = useState(
    initialColumn?.defaultValue ?? BLANK_COLUMN.defaultValue,
  );
  const [nullable, setNullable] = useState(initialColumn?.nullable ?? BLANK_COLUMN.nullable);
  const [comment, setComment] = useState(initialColumn?.comment ?? BLANK_COLUMN.comment);
  const trimmedName = name.trim();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name: trimmedName, type, size, defaultValue, nullable, comment });
      }}
    >
      <label className="mt-4 block text-[14px]">
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          data-autofocus
          className={fieldInput()}
        />
      </label>
      <label className="mt-4 block text-[14px]">
        Type
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ColumnType)}
          className={fieldInput()}
        >
          {SQLITE_COLUMN_TYPES.map((columnType) => (
            <option key={columnType} value={columnType}>
              {columnType}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-[14px]">
        Size
        <input
          type="text"
          value={size}
          onChange={(event) => setSize(event.target.value)}
          className={fieldInput()}
        />
      </label>
      <label className="mt-4 block text-[14px]">
        Default value
        <input
          type="text"
          value={defaultValue}
          onChange={(event) => setDefaultValue(event.target.value)}
          className={fieldInput()}
        />
      </label>
      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={nullable}
          onChange={(event) => setNullable(event.target.checked)}
        />
        Nullable
      </label>
      <label className="mt-4 block text-[14px]">
        Comment
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          className={fieldInput()}
        />
      </label>
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
          disabled={trimmedName === ""}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
