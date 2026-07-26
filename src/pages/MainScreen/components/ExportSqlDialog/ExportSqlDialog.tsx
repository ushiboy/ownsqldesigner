import { saveAs } from "file-saver";
import { useState } from "react";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";

type ExportSqlDialogProps = {
  open: boolean;
  /** Generated DDL for the current schema; "" when there are no tables. */
  ddl: string;
  /** Used to derive the downloaded file's name. */
  schemaName: string;
  onClose: () => void;
};

export function ExportSqlDialog({ open, ddl, schemaName, onClose }: ExportSqlDialogProps) {
  return (
    <Dialog open={open} title="Export SQL" onClose={onClose} size="large">
      <ExportSqlContent ddl={ddl} schemaName={schemaName} onClose={onClose} />
    </Dialog>
  );
}

type ExportSqlContentProps = {
  ddl: string;
  schemaName: string;
  onClose: () => void;
};

// Mounted only while the dialog is open, so the "Copied" state resets each time.
function ExportSqlContent({ ddl, schemaName, onClose }: ExportSqlContentProps) {
  const [copied, setCopied] = useState(false);
  const hasTables = ddl !== "";

  return (
    <>
      {hasTables ? (
        <textarea
          readOnly
          value={ddl}
          rows={16}
          aria-label="Generated SQL"
          className="mt-4 w-full resize-none rounded-md border border-edge bg-surface px-2.5 py-1.5 font-mono text-[12px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      ) : (
        <p className="mt-4 text-[14px]">No tables to export.</p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          disabled={!hasTables}
          onClick={() =>
            saveAs(new Blob([ddl], { type: "application/sql" }), sqlFileName(schemaName))
          }
          className={dialogActionButton({ variant: "secondary" })}
        >
          Download .sql
        </button>
        <button
          type="button"
          disabled={!hasTables}
          onClick={() => {
            void navigator.clipboard.writeText(ddl);
            setCopied(true);
          }}
          className={dialogActionButton({ variant: "secondary" })}
        >
          {copied ? "Copied" : "Copy to clipboard"}
        </button>
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          className={dialogActionButton({ variant: "primary" })}
        >
          Close
        </button>
      </div>
    </>
  );
}

// Sanitizes characters that are unsafe in filenames on common filesystems.
function sqlFileName(schemaName: string): string {
  return `${schemaName.replace(/[\\/:*?"<>|]+/g, "_")}.sql`;
}
