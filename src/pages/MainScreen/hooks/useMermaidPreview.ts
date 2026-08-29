import { useEffect, useState } from "react";

export type MermaidPreviewState =
  | { status: "loading" }
  | { status: "success"; objectUrl: string }
  | { status: "error" };

export function useMermaidPreview(code: string): MermaidPreviewState {
  const [renderedFor, setRenderedFor] = useState(code);
  const [state, setState] = useState<MermaidPreviewState>({ status: "loading" });

  if (code !== renderedFor) {
    setRenderedFor(code);
    setState({ status: "loading" });
  }

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        const { svg } = await mermaid.render(`mermaid-preview-${crypto.randomUUID()}`, code);
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        setState({ status: "success", objectUrl });
      } catch {
        if (!cancelled) {
          setState({ status: "error" });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [code]);

  return state;
}
