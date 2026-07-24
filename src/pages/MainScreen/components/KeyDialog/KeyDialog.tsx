import { useState } from "react";
import { tv } from "tailwind-variants";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import { type Column, type Key, KEY_TYPES, type KeyType } from "../../../../domain/schema";
import { KEY_TYPE_LABELS } from "../../keyTypeLabels";

const fieldInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type KeyFields = Omit<Key, "id">;

type KeyColumn = Pick<Column, "id" | "name">;

type KeyDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  columns: KeyColumn[];
  initialKey?: Key | null;
  primaryKeyDisabled: boolean;
  onSubmit: (fields: KeyFields) => void;
  onCancel: () => void;
};

export function KeyDialog({
  open,
  title,
  submitLabel,
  columns,
  initialKey,
  primaryKeyDisabled,
  onSubmit,
  onCancel,
}: KeyDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <KeyForm
        submitLabel={submitLabel}
        columns={columns}
        initialKey={initialKey ?? null}
        primaryKeyDisabled={primaryKeyDisabled}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Dialog>
  );
}

type KeyFormProps = {
  submitLabel: string;
  columns: KeyColumn[];
  initialKey: Key | null;
  primaryKeyDisabled: boolean;
  onSubmit: (fields: KeyFields) => void;
  onCancel: () => void;
};

const BLANK_KEY: KeyFields = {
  type: "INDEX",
  columnIds: [],
};

// Mounted only while the dialog is open, so form state resets each time.
function KeyForm({
  submitLabel,
  columns,
  initialKey,
  primaryKeyDisabled,
  onSubmit,
  onCancel,
}: KeyFormProps) {
  const [type, setType] = useState(initialKey?.type ?? BLANK_KEY.type);
  const [columnIds, setColumnIds] = useState(initialKey?.columnIds ?? BLANK_KEY.columnIds);

  const toggleColumn = (columnId: string, checked: boolean) => {
    setColumnIds((prev) => (checked ? [...prev, columnId] : prev.filter((id) => id !== columnId)));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ type, columnIds });
      }}
    >
      <label className="mt-4 block text-[14px]">
        Type
        <select
          value={type}
          onChange={(event) => setType(event.target.value as KeyType)}
          className={fieldInput()}
        >
          {KEY_TYPES.map((keyType) => (
            <option
              key={keyType}
              value={keyType}
              disabled={keyType === "PRIMARY_KEY" && primaryKeyDisabled}
            >
              {KEY_TYPE_LABELS[keyType]}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="mt-4 text-[14px]">
        <legend>Columns</legend>
        <ul className="mt-1 space-y-1">
          {columns.map((column) => (
            <li key={column.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={columnIds.includes(column.id)}
                  onChange={(event) => toggleColumn(column.id, event.target.checked)}
                />
                {column.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
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
          disabled={columnIds.length === 0}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
