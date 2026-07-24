import type { Column, Key } from "../../../../domain/schema";
import { KEY_TYPE_LABELS } from "../../keyTypeLabels";

/** A key has no name of its own, so the side panel renders a computed label instead. */
export function describeKey(key: Key, columns: Pick<Column, "id" | "name">[]): string {
  const columnNames = key.columnIds
    .map((columnId) => columns.find((column) => column.id === columnId)?.name)
    .filter((name) => name !== undefined);
  return `${KEY_TYPE_LABELS[key.type]} (${columnNames.join(", ")})`;
}
