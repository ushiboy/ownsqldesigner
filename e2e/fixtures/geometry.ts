export type Position = { x: number; y: number };

// Sanity check that a drag actually displaced a node, not that it landed
// anywhere precise — React Flow's own pointer-event handling makes the exact
// on-screen delta from a simulated drag unreliable to predict.
export const MIN_DRAG_DISTANCE_PX = 50;

// Loose sanity check that what got persisted is roughly where a drag left
// it, not the pre-drag position — catches "drag isn't saved at all"
// regressions. Deliberately generous (not tuned tight): the live post-drag
// render itself is a noisy reference under load (empirically observed
// 9-24px off from the committed value across parallel runs, growing with
// contention), so this check exists only to rule out gross breakage, not to
// pin down an exact pixel.
export const DRAG_PERSISTED_SANITY_TOLERANCE_PX = 60;

export function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
