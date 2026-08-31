import { useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { useTranslations } from "use-intl";
import { parseSchemaFile, type Schema } from "../../../../domain/schema";
import { useNotification } from "../../NotificationContext";
import { useSchemaActions } from "../../SchemaWorkspaceContext";
import { ConfirmDialog } from "../ConfirmDialog";

export type LoadSchemaHandle = {
  openFilePicker: () => void;
};

type LoadSchemaHandlerProps = {
  ref: Ref<LoadSchemaHandle>;
};

export function LoadSchemaHandler({ ref }: LoadSchemaHandlerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSchema, setPendingSchema] = useState<Schema | null>(null);
  const { notify, dismissNotification } = useNotification();
  const { loadSchemaFromFile } = useSchemaActions();
  const t = useTranslations("loadSchema");

  useImperativeHandle(
    ref,
    () => ({
      openFilePicker: () => inputRef.current?.click(),
    }),
    [],
  );

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
