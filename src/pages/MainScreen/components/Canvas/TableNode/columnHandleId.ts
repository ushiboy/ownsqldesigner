const SOURCE_PREFIX = "source:";
const TARGET_PREFIX = "target:";

export function sourceHandleId(columnId: string): string {
  return `${SOURCE_PREFIX}${columnId}`;
}

export function targetHandleId(columnId: string): string {
  return `${TARGET_PREFIX}${columnId}`;
}

export function columnIdFromHandle(handleId: string | null | undefined): string | null {
  if (handleId === null || handleId === undefined) {
    return null;
  }
  if (handleId.startsWith(SOURCE_PREFIX)) {
    return handleId.slice(SOURCE_PREFIX.length);
  }
  if (handleId.startsWith(TARGET_PREFIX)) {
    return handleId.slice(TARGET_PREFIX.length);
  }
  return null;
}

/** Like `columnIdFromHandle`, but `null` unless `handleId` is specifically a source handle. */
export function sourceColumnIdFromHandle(handleId: string | null | undefined): string | null {
  if (handleId === null || handleId === undefined || !handleId.startsWith(SOURCE_PREFIX)) {
    return null;
  }
  return handleId.slice(SOURCE_PREFIX.length);
}
