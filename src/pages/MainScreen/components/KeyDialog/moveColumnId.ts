export function moveColumnIdUp(columnIds: string[], columnId: string): string[] {
  return moveColumnId(columnIds, columnId, "up");
}

export function moveColumnIdDown(columnIds: string[], columnId: string): string[] {
  return moveColumnId(columnIds, columnId, "down");
}

function moveColumnId(columnIds: string[], columnId: string, direction: "up" | "down"): string[] {
  const index = columnIds.indexOf(columnId);
  if (index === -1) return columnIds;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= columnIds.length) return columnIds;
  const next = [...columnIds];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
