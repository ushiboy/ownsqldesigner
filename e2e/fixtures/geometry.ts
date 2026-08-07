export type Position = { x: number; y: number };

export function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
