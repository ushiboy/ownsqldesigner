import { useRef, useState } from "react";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { parseSchemaFile, type Schema } from "../../../../domain/schema";
import { useNotification } from "../../NotificationContext";
import { useSchemaActions } from "../../SchemaWorkspaceContext";
import { ConfirmDialog } from "../ConfirmDialog";

const toolButton = tv({
  base: "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[14px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

export function LoadSchemaButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSchema, setPendingSchema] = useState<Schema | null>(null);
  const { notify, dismissNotification } = useNotification();
  const { loadSchemaFromFile } = useSchemaActions();
  const t = useTranslations("loadSchema");

  async function handleFileChange(file: File) {
    const parsed = parseSchemaFile(await file.text());
    if (parsed === null) {
      notify(t("couldNotLoadFile"));
      return;
    }
    dismissNotification();
    setPendingSchema(parsed);
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} className={toolButton()}>
        {t("buttonLabel")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        aria-label={t("fileInputAriaLabel")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so re-selecting the same filename still fires a change event.
          event.target.value = "";
          if (file !== undefined) {
            void handleFileChange(file);
          }
        }}
      />
      <ConfirmDialog
        open={pendingSchema !== null}
        title={t("dialogTitle")}
        message={t("confirmMessage", { name: pendingSchema?.name ?? "" })}
        confirmLabel={t("confirmLabel")}
        onConfirm={() => {
          if (pendingSchema !== null) {
            loadSchemaFromFile(pendingSchema);
          }
          setPendingSchema(null);
        }}
        onCancel={() => setPendingSchema(null)}
      />
    </>
  );
}
