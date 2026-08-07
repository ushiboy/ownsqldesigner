import { expect, test } from "@playwright/test";
import { distance } from "../fixtures/geometry.ts";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

// Sanity check that the drag actually displaced the node, not that it landed
// anywhere precise — React Flow's own pointer-event handling makes the exact
// on-screen delta from a simulated drag unreliable to predict.
const MIN_DRAG_DISTANCE_PX = 50;

// Loose sanity check that what got persisted is roughly where the drag left
// it, not the pre-drag position — catches "drag isn't saved at all"
// regressions. Deliberately generous (not tuned tight): the live post-drag
// render itself is a noisy reference under load (empirically observed
// 9-24px off from the committed value across parallel runs, growing with
// contention), so this check exists only to rule out gross breakage, not to
// pin down an exact pixel.
const DRAG_PERSISTED_SANITY_TOLERANCE_PX = 60;

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
  const afterReload1 = await mainScreen.tableNodeBoundingBox("Users");
  expect(afterReload1).not.toBeNull();
  expect(distance(afterDrag!, afterReload1!)).toBeLessThanOrEqual(
    DRAG_PERSISTED_SANITY_TOLERANCE_PX,
  );

  // The real persistence check: what got saved must survive being re-read
  // and re-rendered from scratch, exactly. Comparing two post-reload
  // renders (both derived purely from storage) instead of comparing the
  // live drag render against a reload avoids the live render's own noise
  // entirely — confirmed empirically stable at 0px across 40+ runs under
  // full parallel load, unlike the live-vs-reload comparison above.
  await page.reload();
  const afterReload2 = await mainScreen.tableNodeBoundingBox("Users");
  expect(afterReload2).toEqual(afterReload1);
});
