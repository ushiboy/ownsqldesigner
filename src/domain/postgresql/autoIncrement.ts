import type { Column } from "../schema/types";

/** PostgreSQL only allows an identity column on a single INTEGER PRIMARY KEY column (REQ-039). */
export function isPostgresqlAutoIncrementEligible(
  column: Column,
  pkColumnId: string | undefined,
): boolean {
  return column.type === "INTEGER" && column.id === pkColumnId;
}
