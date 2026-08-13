/** Case-insensitive membership check, matching PostgreSQL's unquoted-identifier lowercase folding. */
export function isPostgresqlNameTaken(name: string, existingNames: string[]): boolean {
  const normalized = name.toLowerCase();
  return existingNames.some((existing) => existing.toLowerCase() === normalized);
}
