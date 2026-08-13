import type { Column } from "../schema/types";

/** PostgreSQL only allows an identity column on a single SMALLINT, INTEGER, or BIGINT PRIMARY KEY column (REQ-039). */
export function isPostgresqlAutoIncrementEligible(
  column: Column,
  pkColumnId: string | undefined,
): boolean {
  return (
    (column.type === "SMALLINT" || column.type === "INTEGER" || column.type === "BIGINT") &&
    column.id === pkColumnId
  );
}
