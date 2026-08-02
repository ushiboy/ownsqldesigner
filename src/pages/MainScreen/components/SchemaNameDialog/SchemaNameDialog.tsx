import { useState } from "react";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";

const nameInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type SchemaNameDialogProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialName?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

export function SchemaNameDialog({
  open,
  title,
  submitLabel,
  initialName,
  onSubmit,
  onCancel,
}: SchemaNameDialogProps) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      <SchemaNameForm
        submitLabel={submitLabel}
        initialName={initialName ?? ""}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Dialog>
  );
}

type SchemaNameFormProps = {
  submitLabel: string;
  initialName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

// Mounted only while the dialog is open, so the input state resets each time.
function SchemaNameForm({ submitLabel, initialName, onSubmit, onCancel }: SchemaNameFormProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("schemaDialog");
  const [name, setName] = useState(initialName);
  const trimmedName = name.trim();

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
          disabled={trimmedName === ""}
          className={dialogActionButton({ variant: "primary" })}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
