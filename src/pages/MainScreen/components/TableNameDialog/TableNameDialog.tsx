import { useState } from "react";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import type { DialectStrategy } from "../../../../domain/dialect";
import { describeNameValidity } from "../../../../domain/schema";

const nameInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type TableNameDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialName?: string;
  /** The current schema's dialect strategy; resolves the identifier-comparison rule. */
  strategy: DialectStrategy;
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
  strategy,
  existingNames,
  onSubmit,
  onCancel,
}: TableNameDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <TableNameForm
        submitLabel={submitLabel}
        initialName={initialName ?? ""}
        strategy={strategy}
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
  strategy: DialectStrategy;
  existingNames: string[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

function TableNameForm({
  submitLabel,
  initialName,
  strategy,
  existingNames,
  onSubmit,
  onCancel,
}: TableNameFormProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("tableDialog");
  const [name, setName] = useState(initialName);
  const trimmedName = name.trim();
  const { isInvalidShape, isReserved, isDuplicate, isInvalid } = describeNameValidity(
    trimmedName,
    existingNames,
    strategy,
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(trimmedName);
      }}
    >
      <label className="mt-4 block text-[14px]">
        {t("fieldLabel")}
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          data-autofocus
          className={nameInput()}
        />
      </label>
      {isInvalidShape && (
        <p className="mt-1 text-[12px] text-body">{tCommon("invalidNameShapeHint")}</p>
      )}
      {isReserved && <p className="mt-1 text-[12px] text-body">{tCommon("reservedNameHint")}</p>}
      {isDuplicate && <p className="mt-1 text-[12px] text-body">{tCommon("duplicateTableName")}</p>}
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
          disabled={isInvalid}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
