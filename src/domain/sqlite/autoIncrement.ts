import type { Column } from "../schema/types";

/** SQLite only allows AUTOINCREMENT on a single INTEGER PRIMARY KEY column (REQ-033). */
export function isSqliteAutoIncrementEligible(
  column: Column,
  pkColumnId: string | undefined,
): boolean {
  return column.type === "INTEGER" && column.id === pkColumnId;
}
