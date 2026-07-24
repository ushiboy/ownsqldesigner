import { useState } from "react";
import { tv } from "tailwind-variants";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import {
  type Column,
  type ColumnKeyMembership,
  type ColumnType,
  KEY_TYPES,
  SQLITE_COLUMN_TYPES,
} from "../../../../domain/schema";

const fieldInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

// Sentence-case, matching this form's other checkboxes (Nullable, Auto
// increment) — unlike KeyDialog/describeKey, which use SQL-flavored labels.
const KEY_MEMBERSHIP_CHECKBOX_LABELS: Record<(typeof KEY_TYPES)[number], string> = {
  PRIMARY_KEY: "Primary Key",
  UNIQUE: "Unique",
  INDEX: "Index",
};

const KEY_MEMBERSHIP_DISABLED_HINT: Record<(typeof KEY_TYPES)[number], string> = {
  PRIMARY_KEY: "Another key already holds this table's PRIMARY KEY.",
  UNIQUE: "This column is part of a composite UNIQUE key — manage it from the Keys section.",
  INDEX: "This column is part of a composite INDEX key — manage it from the Keys section.",
};

type ColumnFields = Omit<Column, "id">;

type ColumnDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialColumn?: Column | null;
  /** Whether this column currently solely owns each single-column key type; seeds the checkboxes. */
  keyMembership: ColumnKeyMembership;
  /** Whether each checkbox is unavailable (a different/composite key of that type already applies). */
  keyMembershipDisabled: ColumnKeyMembership;
  onSubmit: (fields: ColumnFields, keyMembership: ColumnKeyMembership) => void;
  onCancel: () => void;
};

export function ColumnDialog({
  open,
  title,
  submitLabel,
  initialColumn,
  keyMembership,
  keyMembershipDisabled,
  onSubmit,
  onCancel,
}: ColumnDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <ColumnForm
        submitLabel={submitLabel}
        initialColumn={initialColumn ?? null}
        keyMembership={keyMembership}
        keyMembershipDisabled={keyMembershipDisabled}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Dialog>
  );
}

type ColumnFormProps = {
  submitLabel: string;
  initialColumn: Column | null;
  keyMembership: ColumnKeyMembership;
  keyMembershipDisabled: ColumnKeyMembership;
  onSubmit: (fields: ColumnFields, keyMembership: ColumnKeyMembership) => void;
  onCancel: () => void;
};

const BLANK_COLUMN: ColumnFields = {
  name: "",
  type: "TEXT",
  size: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

// Mounted only while the dialog is open, so form state resets each time.
function ColumnForm({
  submitLabel,
  initialColumn,
  keyMembership: initialKeyMembership,
  keyMembershipDisabled,
  onSubmit,
  onCancel,
}: ColumnFormProps) {
  const [fields, setFields] = useState<ColumnFields>(initialColumn ?? BLANK_COLUMN);
  const [keyMembership, setKeyMembership] = useState(initialKeyMembership);
  const trimmedName = fields.name.trim();
  // Live against the checkbox above, not the seeded initial value: checking
  // Primary Key and Auto increment together in one submit is the point.
  const autoIncrementAllowed = keyMembership.PRIMARY_KEY && fields.type === "INTEGER";

  const setField = <K extends keyof ColumnFields>(key: K, value: ColumnFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          {
            ...fields,
            name: trimmedName,
            autoIncrement: fields.autoIncrement && autoIncrementAllowed,
          },
          keyMembership,
        );
      }}
    >
      <label className="mt-4 block text-[14px]">
        Name
        <input
          type="text"
          value={fields.name}
          onChange={(event) => setField("name", event.target.value)}
          data-autofocus
          className={fieldInput()}
        />
      </label>
      <label className="mt-4 block text-[14px]">
        Type
        <select
          value={fields.type}
          onChange={(event) => setField("type", event.target.value as ColumnType)}
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
          value={fields.size}
          onChange={(event) => setField("size", event.target.value)}
          className={fieldInput()}
        />
      </label>
      <label className="mt-4 block text-[14px]">
        Default value
        <input
          type="text"
          value={fields.defaultValue}
          onChange={(event) => setField("defaultValue", event.target.value)}
          className={fieldInput()}
        />
      </label>
      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={fields.nullable}
          onChange={(event) => setField("nullable", event.target.checked)}
        />
        Nullable
      </label>
      {KEY_TYPES.map((keyType) => (
        <div key={keyType}>
          <label className="mt-4 flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={keyMembership[keyType]}
              disabled={keyMembershipDisabled[keyType]}
              onChange={(event) =>
                setKeyMembership((prev) => ({ ...prev, [keyType]: event.target.checked }))
              }
            />
            {KEY_MEMBERSHIP_CHECKBOX_LABELS[keyType]}
          </label>
          {keyMembershipDisabled[keyType] && (
            <p className="mt-1 text-[12px] text-body">{KEY_MEMBERSHIP_DISABLED_HINT[keyType]}</p>
          )}
        </div>
      ))}
      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={fields.autoIncrement}
          disabled={!autoIncrementAllowed}
          onChange={(event) => setField("autoIncrement", event.target.checked)}
        />
        Auto increment
      </label>
      {!autoIncrementAllowed && (
        <p className="mt-1 text-[12px] text-body">
          Only available when this is the table's sole PRIMARY KEY column of type INTEGER.
        </p>
      )}
      <label className="mt-4 block text-[14px]">
        Comment
        <textarea
          value={fields.comment}
          onChange={(event) => setField("comment", event.target.value)}
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
