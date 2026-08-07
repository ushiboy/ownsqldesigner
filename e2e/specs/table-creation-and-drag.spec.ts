import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

type Position = { x: number; y: number };

// Sanity check that the drag actually displaced the node, not that it landed
// anywhere precise — React Flow's own pointer-event handling makes the exact
// on-screen delta from a simulated drag unreliable to predict.
const MIN_DRAG_DISTANCE_PX = 50;

// The position actually reached by the drag (read back from the DOM, not
// computed from the requested delta) is what must survive a reload. Not
// exact: React Flow's committed position-change event (what actually gets
// saved) lands a few pixels short of the live post-drag render on the axis
// affected by the toolbar's vertical offset — a library discretization
// detail, not a persistence bug. Empirically ~9.14px consistently (15/15
// runs), so this is set well above that with margin, not tuned to a flaky
// edge.
const RELOAD_POSITION_TOLERANCE_PX = 15;

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("creates a table and persists its dragged position after reload", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await expect(mainScreen.tableNode("Users")).toBeVisible();

  const before = await mainScreen.tableNodeBoundingBox("Users");
  expect(before).not.toBeNull();

  await mainScreen.dragTableNode("Users", 150, 80);

  const afterDrag = await mainScreen.tableNodeBoundingBox("Users");
  expect(afterDrag).not.toBeNull();
  expect(distance(before!, afterDrag!)).toBeGreaterThan(MIN_DRAG_DISTANCE_PX);

  await page.reload();

  const afterReload = await mainScreen.tableNodeBoundingBox("Users");
  expect(afterReload).not.toBeNull();
  expect(distance(afterDrag!, afterReload!)).toBeLessThanOrEqual(RELOAD_POSITION_TOLERANCE_PX);
});
