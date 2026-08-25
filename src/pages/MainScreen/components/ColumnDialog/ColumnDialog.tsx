import { useState } from "react";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import type { DialectStrategy } from "../../../../domain/dialect";
import {
  type Column,
  type ColumnKeyMembership,
  type ColumnKeyMembershipDisabled,
  describeNameValidity,
  KEY_TYPES,
} from "../../../../domain/schema";

const fieldInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

// A hypothetical column/PK id pair used solely to ask the strategy "would a
// column with these fields be auto-increment eligible if it were the
// table's sole PRIMARY KEY column?" — see `autoIncrementAllowed` below.
const PK_CANDIDATE_ID = "candidate";

type ColumnFields = Omit<Column, "id">;

type ColumnDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialColumn?: Column | null;
  /** The current schema's dialect strategy; resolves allowed column types and validation rules. */
  strategy: DialectStrategy;
  /** Sibling column names to validate against (REQ-018); caller excludes the column being edited. */
  existingNames: string[];
  /** Whether this column currently solely owns each single-column key type; seeds the checkboxes. */
  keyMembership: ColumnKeyMembership;
  /** Why each checkbox is unavailable, or `null` if it isn't. */
  keyMembershipDisabled: ColumnKeyMembershipDisabled;
  onSubmit: (fields: ColumnFields, keyMembership: ColumnKeyMembership) => void;
  onCancel: () => void;
};

export function ColumnDialog({
  open,
  title,
  submitLabel,
  initialColumn,
  strategy,
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
        strategy={strategy}
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
  strategy: DialectStrategy;
  existingNames: string[];
  keyMembership: ColumnKeyMembership;
  keyMembershipDisabled: ColumnKeyMembershipDisabled;
  onSubmit: (fields: ColumnFields, keyMembership: ColumnKeyMembership) => void;
  onCancel: () => void;
};

const BLANK_COLUMN: ColumnFields = {
  name: "",
  type: "TEXT",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

// Mounted only while the dialog is open, so form state resets each time.
function ColumnForm({
  submitLabel,
  initialColumn,
  strategy,
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
    isInvalidShape: isNameInvalidShape,
    isReserved: isNameReserved,
    isDuplicate: isNameDuplicate,
    isInvalid: isNameInvalid,
  } = describeNameValidity(trimmedName, existingNames, strategy);
  const columnTypes = strategy.columnTypes;
  // Live against the checkbox above, not the seeded initial value: checking
  // Primary Key and Auto increment together in one submit is the point.
  // Asks the strategy directly rather than hardcoding a type check, so a
  // future dialect's own eligibility rule (not necessarily "INTEGER only")
  // is reflected here too.
  const autoIncrementAllowed = strategy.isAutoIncrementEligible(
    { ...fields, id: PK_CANDIDATE_ID },
    keyMembership.PRIMARY_KEY ? PK_CANDIDATE_ID : undefined,
  );
  const effectiveAutoIncrement = fields.autoIncrement && autoIncrementAllowed;
  const sizeAllowed = strategy.sizableColumnTypes.includes(fields.type);
  const precisionAllowed = strategy.precisionColumnTypes.includes(fields.type);
  const isSizeFormatValid = strategy.isSizeValid(fields.type, fields.size);
  const isPrecisionFormatValid = strategy.isPrecisionValid(fields.type, fields.precision);
  const defaultValueAllowed = !effectiveAutoIncrement || strategy.allowsDefaultWithAutoIncrement;
  const isDefaultValueFormatValid = strategy.isDefaultValueValid(fields.type, fields.defaultValue);

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
            autoIncrement: effectiveAutoIncrement,
            size: sizeAllowed ? fields.size : "",
            precision: precisionAllowed ? fields.precision : "",
            defaultValue: defaultValueAllowed ? fields.defaultValue : "",
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
            {isNameReserved && (
              <p className="mt-1 text-[12px] text-body">{tCommon("reservedNameHint")}</p>
            )}
            {isNameDuplicate && (
              <p className="mt-1 text-[12px] text-body">{tCommon("duplicateColumnName")}</p>
            )}
          </div>
          <label className="block text-[14px]">
            {tCommon("typeLabel")}
            <select
              value={fields.type}
              onChange={(event) => {
                const type = event.target.value;
                const nextSizeAllowed = strategy.sizableColumnTypes.includes(type);
                const nextPrecisionAllowed = strategy.precisionColumnTypes.includes(type);
                setFields((prev) => ({
                  ...prev,
                  type,
                  size: nextSizeAllowed ? prev.size : "",
                  precision: nextPrecisionAllowed ? prev.precision : "",
                }));
              }}
              className={fieldInput()}
            >
              {columnTypes.map((columnType) => (
                <option key={columnType} value={columnType}>
                  {columnType}
                </option>
              ))}
            </select>
          </label>
          <div>
            <label className="block text-[14px]">
              {t("sizeLabel")}
              <input
                type="text"
                value={fields.size}
                disabled={!sizeAllowed}
                onChange={(event) => setField("size", event.target.value)}
                className={fieldInput()}
              />
            </label>
            {!sizeAllowed && (
              <p className="mt-1 text-[12px] text-body">{t("sizeNotApplicableHint")}</p>
            )}
            {sizeAllowed && !isSizeFormatValid && (
              <p className="mt-1 text-[12px] text-body">{t("sizeInvalidFormatHint")}</p>
            )}
          </div>
          <div>
            <label className="block text-[14px]">
              {t("precisionLabel")}
              <input
                type="text"
                value={fields.precision}
                disabled={!precisionAllowed}
                onChange={(event) => setField("precision", event.target.value)}
                className={fieldInput()}
              />
            </label>
            {!precisionAllowed && (
              <p className="mt-1 text-[12px] text-body">{t("precisionNotApplicableHint")}</p>
            )}
            {precisionAllowed && !isPrecisionFormatValid && (
              <p className="mt-1 text-[12px] text-body">{t("precisionInvalidFormatHint")}</p>
            )}
          </div>
          <div>
            <label className="block text-[14px]">
              {t("defaultValueLabel")}
              <input
                type="text"
                value={fields.defaultValue}
                disabled={!defaultValueAllowed}
                onChange={(event) => setField("defaultValue", event.target.value)}
                className={fieldInput()}
              />
            </label>
            {!defaultValueAllowed && (
              <p className="mt-1 text-[12px] text-body">{t("defaultValueNotApplicableHint")}</p>
            )}
            {defaultValueAllowed && !isDefaultValueFormatValid && (
              <p className="mt-1 text-[12px] text-body">{t("defaultValueInvalidFormatHint")}</p>
            )}
          </div>
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
                  disabled={keyMembershipDisabled[keyType] !== null}
                  onChange={(event) =>
                    setKeyMembership((prev) => ({ ...prev, [keyType]: event.target.checked }))
                  }
                />
                {t(`keyMembershipCheckboxLabels.${keyType}`)}
              </label>
              {keyMembershipDisabled[keyType] !== null && (
                <p className="mt-1 text-[12px] text-body">
                  {t(`keyMembershipDisabledHint.${keyMembershipDisabled[keyType]}`)}
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
                onChange={(event) => {
                  const checked = event.target.checked;
                  const nextDefaultValueAllowed =
                    !checked || strategy.allowsDefaultWithAutoIncrement;
                  setFields((prev) => ({
                    ...prev,
                    autoIncrement: checked,
                    defaultValue: nextDefaultValueAllowed ? prev.defaultValue : "",
                  }));
                }}
              />
              {t("autoIncrementLabel")}
            </label>
            {!autoIncrementAllowed && (
              <p className="mt-1 text-[12px] text-body">
                {t("autoIncrementHint", {
                  types: strategy.autoIncrementEligibleColumnTypes.join(" / "),
                })}
              </p>
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
          disabled={isColumnFormInvalid({
            isNameInvalid,
            sizeAllowed,
            isSizeFormatValid,
            precisionAllowed,
            isPrecisionFormatValid,
            defaultValueAllowed,
            isDefaultValueFormatValid,
          })}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function isColumnFormInvalid({
  isNameInvalid,
  sizeAllowed,
  isSizeFormatValid,
  precisionAllowed,
  isPrecisionFormatValid,
  defaultValueAllowed,
  isDefaultValueFormatValid,
}: {
  isNameInvalid: boolean;
  sizeAllowed: boolean;
  isSizeFormatValid: boolean;
  precisionAllowed: boolean;
  isPrecisionFormatValid: boolean;
  defaultValueAllowed: boolean;
  isDefaultValueFormatValid: boolean;
}): boolean {
  return (
    isNameInvalid ||
    (sizeAllowed && !isSizeFormatValid) ||
    (precisionAllowed && !isPrecisionFormatValid) ||
    (defaultValueAllowed && !isDefaultValueFormatValid)
  );
}
