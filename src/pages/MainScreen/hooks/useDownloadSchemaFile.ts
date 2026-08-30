import { saveAs } from "file-saver";
import { useCurrentSchema } from "../SchemaWorkspaceContext";

type UseDownloadSchemaFileResult = {
  canDownload: boolean;
  downloadSchemaFile: () => void;
};

export function useDownloadSchemaFile(): UseDownloadSchemaFileResult {
  const schema = useCurrentSchema();

  return {
    canDownload: schema !== null,
    downloadSchemaFile: () => {
      if (schema === null) {
        return;
      }
      saveAs(
        new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" }),
        jsonFileName(schema.name),
      );
    },
  };
}

function jsonFileName(schemaName: string): string {
  return `${schemaName.replace(/[\\/:*?"<>|]+/g, "_")}.json`;
}
