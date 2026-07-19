import { useEffect, useState } from "react";

type UseSchemaNameDialogOptions = {
  onCancel: () => void;
};

type UseSchemaNameDialogResult = {
  name: string;
  trimmedName: string;
  setName: (name: string) => void;
};

export function useSchemaNameDialog({
  onCancel,
}: UseSchemaNameDialogOptions): UseSchemaNameDialogResult {
  const [name, setName] = useState("");
  const trimmedName = name.trim();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return { name, trimmedName, setName };
}
