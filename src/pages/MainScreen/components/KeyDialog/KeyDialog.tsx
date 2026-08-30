import { useState } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import {
  type Column,
  hasDuplicateIndexColumnSet,
  type Key,
  keepsColumnReferenceable,
  KEY_TYPES,
  type KeyType,
} from "../../../../domain/schema";
import { KEY_TYPE_LABELS } from "../../keyTypeLabels";
import { moveColumnIdDown, moveColumnIdUp } from "./moveColumnId";

const fieldInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

// Small icon-only button, matching SidePanel.tsx's local `iconButton` — no
// shared icon-button component exists yet in this codebase.
const iconButton = tv({
  base: "inline-flex items-center rounded-md p-1 text-body transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40",
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
  isReferencedByForeignKey: boolean;
  existingKeys: Key[];
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
  isReferencedByForeignKey,
  existingKeys,
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
        isReferencedByForeignKey={isReferencedByForeignKey}
        existingKeys={existingKeys}
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
  isReferencedByForeignKey: boolean;
  existingKeys: Key[];
  onSubmit: (fields: KeyFields) => void;
  onCancel: () => void;
};

const BLANK_KEY: KeyFields = {
  type: "INDEX",
  columnIds: [],
};

function KeyForm({
  submitLabel,
  columns,
  initialKey,
  primaryKeyDisabled,
  isReferencedByForeignKey,
  existingKeys,
  onSubmit,
  onCancel,
}: KeyFormProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("keyDialog");
  const [type, setType] = useState(initialKey?.type ?? BLANK_KEY.type);
  const [columnIds, setColumnIds] = useState(initialKey?.columnIds ?? BLANK_KEY.columnIds);

  const wouldBreakReference =
    isReferencedByForeignKey &&
    initialKey !== null &&
    columnIds.length > 0 &&
    !keepsColumnReferenceable(initialKey, { type, columnIds });
  const isDuplicateIndex = hasDuplicateIndexColumnSet(existingKeys, { type, columnIds });

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
        {tCommon("typeLabel")}
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
        <legend>{t("columnsLegend")}</legend>
        <ul className="mt-1 space-y-1">
          {columns.map((column) => {
            const position = columnIds.indexOf(column.id);
            const isChecked = position !== -1;
            return (
              <li key={column.id} className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => toggleColumn(column.id, event.target.checked)}
                  />
                  {column.name}
                </label>
                {isChecked && columnIds.length > 1 && (
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-body">{position + 1}</span>
                    <button
                      type="button"
                      aria-label={t("moveColumnUp", { column: column.name })}
                      disabled={position === 0}
                      onClick={() => setColumnIds((prev) => moveColumnIdUp(prev, column.id))}
                      className={iconButton()}
                    >
                      <LuChevronUp aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("moveColumnDown", { column: column.name })}
                      disabled={position === columnIds.length - 1}
                      onClick={() => setColumnIds((prev) => moveColumnIdDown(prev, column.id))}
                      className={iconButton()}
                    >
                      <LuChevronDown aria-hidden="true" className="size-4" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>
      {wouldBreakReference && (
        <p className="mt-1 text-[12px] text-body">{t("referencedKeyEditBlockedHint")}</p>
      )}
      {isDuplicateIndex && <p className="mt-1 text-[12px] text-body">{t("duplicateIndexHint")}</p>}
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
          disabled={columnIds.length === 0 || wouldBreakReference || isDuplicateIndex}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
