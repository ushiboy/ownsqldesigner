import { useRef, useState } from "react";
import { tv } from "tailwind-variants";
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

  async function handleFileChange(file: File) {
    const parsed = parseSchemaFile(await file.text());
    if (parsed === null) {
      notify("Could not load the schema file. It is not a valid schema file.");
      return;
    }
    dismissNotification();
    setPendingSchema(parsed);
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} className={toolButton()}>
        Load JSON
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        aria-label="Load schema file"
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
        title="Load Schema"
        message={`Replace the current schema with "${pendingSchema?.name ?? ""}"? This cannot be undone.`}
        confirmLabel="Load"
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
