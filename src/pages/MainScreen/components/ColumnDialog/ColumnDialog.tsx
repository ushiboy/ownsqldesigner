import { useState } from "react";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import { getDialectStrategy, type SqlDialect } from "../../../../domain/dialect";
import {
  type Column,
  type ColumnKeyMembership,
  describeNameValidity,
  KEY_TYPES,
} from "../../../../domain/schema";

const fieldInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type ColumnFields = Omit<Column, "id">;

type ColumnDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialColumn?: Column | null;
  /** The current schema's dialect; resolves the allowed column types and identifier-comparison rule. */
  dialect: SqlDialect;
  /** Sibling column names to validate against (REQ-018); caller excludes the column being edited. */
  existingNames: string[];
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
  dialect,
  existingNames,
  keyMembership,
  keyMembershipDisabled,
  onSubmit,
  onCancel,
}: ColumnDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel} size="large">
      <ColumnForm
        submitLabel={submitLabel}
        initialColumn={initialColumn ?? null}
        dialect={dialect}
        existingNames={existingNames}
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
  dialect: SqlDialect;
  existingNames: string[];
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
  dialect,
  existingNames,
  keyMembership: initialKeyMembership,
  keyMembershipDisabled,
  onSubmit,
  onCancel,
}: ColumnFormProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("columnDialog");
  const [fields, setFields] = useState<ColumnFields>(initialColumn ?? BLANK_COLUMN);
  const [keyMembership, setKeyMembership] = useState(initialKeyMembership);
  const trimmedName = fields.name.trim();
  const {
    isEmpty: isNameEmpty,
    isInvalidShape: isNameInvalidShape,
    isDuplicate: isNameDuplicate,
  } = describeNameValidity(trimmedName, existingNames, dialect);
  const columnTypes = getDialectStrategy(dialect).columnTypes;
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
      <div className="mt-4 grid grid-cols-2 gap-x-6">
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[14px]">
              {tCommon("nameLabel")}
              <input
                type="text"
                value={fields.name}
                onChange={(event) => setField("name", event.target.value)}
                data-autofocus
                className={fieldInput()}
              />
            </label>
            {isNameInvalidShape && (
              <p className="mt-1 text-[12px] text-body">{tCommon("invalidNameShapeHint")}</p>
            )}
            {isNameDuplicate && (
              <p className="mt-1 text-[12px] text-body">{tCommon("duplicateColumnName")}</p>
            )}
          </div>
          <label className="block text-[14px]">
            {tCommon("typeLabel")}
            <select
              value={fields.type}
              onChange={(event) => setField("type", event.target.value)}
              className={fieldInput()}
            >
              {columnTypes.map((columnType) => (
                <option key={columnType} value={columnType}>
                  {columnType}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[14px]">
            {t("sizeLabel")}
            <input
              type="text"
              value={fields.size}
              onChange={(event) => setField("size", event.target.value)}
              className={fieldInput()}
            />
          </label>
          <label className="block text-[14px]">
            {t("defaultValueLabel")}
            <input
              type="text"
              value={fields.defaultValue}
              onChange={(event) => setField("defaultValue", event.target.value)}
              className={fieldInput()}
            />
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={fields.nullable}
              onChange={(event) => setField("nullable", event.target.checked)}
            />
            {t("nullableLabel")}
          </label>
        </div>
        <div className="flex flex-col gap-3">
          {KEY_TYPES.map((keyType) => (
            <div key={keyType}>
              <label className="flex items-center gap-2 text-[14px]">
                <input
                  type="checkbox"
                  checked={keyMembership[keyType]}
                  disabled={keyMembershipDisabled[keyType]}
                  onChange={(event) =>
                    setKeyMembership((prev) => ({ ...prev, [keyType]: event.target.checked }))
                  }
                />
                {t(`keyMembershipCheckboxLabels.${keyType}`)}
              </label>
              {keyMembershipDisabled[keyType] && (
                <p className="mt-1 text-[12px] text-body">
                  {t(`keyMembershipDisabledHint.${keyType}`)}
                </p>
              )}
            </div>
          ))}
          <div>
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={fields.autoIncrement}
                disabled={!autoIncrementAllowed}
                onChange={(event) => setField("autoIncrement", event.target.checked)}
              />
              {t("autoIncrementLabel")}
            </label>
            {!autoIncrementAllowed && (
              <p className="mt-1 text-[12px] text-body">{t("autoIncrementHint")}</p>
            )}
          </div>
        </div>
      </div>
      <label className="mt-4 block text-[14px]">
        {tCommon("commentLabel")}
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
          {tCommon("cancel")}
        </button>
        <button
          type="submit"
          disabled={isNameEmpty || isNameInvalidShape || isNameDuplicate}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
