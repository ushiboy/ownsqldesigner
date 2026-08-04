/** Case-insensitive membership check, matching SQLite's own identifier comparison. */
export function isSqliteNameTaken(name: string, existingNames: string[]): boolean {
  const normalized = name.toLowerCase();
  return existingNames.some((existing) => existing.toLowerCase() === normalized);
}
