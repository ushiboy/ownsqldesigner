import { saveAs } from "file-saver";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { tv } from "tailwind-variants";
import { Dialog, dialogActionButton } from "../../../../components/parts/Dialog";
import { useMermaidPreview } from "../../hooks/useMermaidPreview";

const tabButton = tv({
  base: "rounded-md px-3 py-1.5 text-[13px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  variants: {
    pressed: {
      true: "bg-accent-bg text-accent",
    },
  },
});

type Tab = "code" | "preview";

type ExportMermaidDialogProps = {
  open: boolean;
  code: string;
  schemaName: string;
  onClose: () => void;
};

export function ExportMermaidDialog({ open, code, schemaName, onClose }: ExportMermaidDialogProps) {
  const t = useTranslations("exportMermaid");
  return (
    <Dialog open={open} title={t("title")} onClose={onClose} size="large">
      <ExportMermaidContent code={code} schemaName={schemaName} onClose={onClose} />
    </Dialog>
  );
}

type ExportMermaidContentProps = {
  code: string;
  schemaName: string;
  onClose: () => void;
};

function ExportMermaidContent({ code, schemaName, onClose }: ExportMermaidContentProps) {
  const t = useTranslations("exportMermaid");
  const [tab, setTab] = useState<Tab>("code");
  const [copied, setCopied] = useState(false);
  const hasTables = code !== "";

  return (
    <>
      <div role="tablist" className="mt-4 flex gap-1">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "code"}
          onClick={() => setTab("code")}
          className={tabButton({ pressed: tab === "code" })}
        >
          {t("codeTab")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          onClick={() => setTab("preview")}
          className={tabButton({ pressed: tab === "preview" })}
        >
          {t("previewTab")}
        </button>
      </div>
      {hasTables ? (
        <div role="tabpanel">
          {tab === "code" ? (
            <textarea
              readOnly
              value={code}
              rows={16}
              aria-label={t("generatedCodeAriaLabel")}
              className="mt-4 w-full resize-none rounded-md border border-edge bg-surface px-2.5 py-1.5 font-mono text-[12px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          ) : (
            <MermaidPreview code={code} />
          )}
        </div>
      ) : (
        <p className="mt-4 text-[14px]">{t("noTablesMessage")}</p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          disabled={!hasTables}
          onClick={() =>
            saveAs(new Blob([code], { type: "text/plain" }), mermaidFileName(schemaName))
          }
          className={dialogActionButton({ variant: "secondary" })}
        >
          {t("downloadMermaid")}
        </button>
        <button
          type="button"
          disabled={!hasTables}
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
          }}
          className={dialogActionButton({ variant: "secondary" })}
        >
          {copied ? t("copied") : t("copyToClipboard")}
        </button>
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          className={dialogActionButton({ variant: "primary" })}
        >
          {t("close")}
        </button>
      </div>
    </>
  );
}

type MermaidPreviewProps = {
  code: string;
};

function MermaidPreview({ code }: MermaidPreviewProps) {
  const t = useTranslations("exportMermaid");
  const state = useMermaidPreview(code);

  if (state.status === "loading") {
    return <p className="mt-4 text-[14px] text-body">{t("previewLoadingMessage")}</p>;
  }
  if (state.status === "error") {
    return <p className="mt-4 text-[14px] text-danger">{t("previewErrorMessage")}</p>;
  }
  return (
    <div className="mt-4 max-h-[420px] overflow-auto rounded-md border border-edge bg-surface p-2">
      <img src={state.objectUrl} alt={t("previewImageAlt")} />
    </div>
  );
}

function mermaidFileName(schemaName: string): string {
  return `${schemaName.replace(/[\\/:*?"<>|]+/g, "_")}.mmd`;
}
