import { expect, test } from "@playwright/test";
import { distance, type Position } from "../fixtures/geometry.ts";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

// Sanity check that the drag actually displaced the selection, not that it
// landed anywhere precise — see table-creation-and-drag.spec.ts.
const MIN_DRAG_DISTANCE_PX = 50;

// Loose sanity check that what got persisted is roughly where the drag left
// it — see table-creation-and-drag.spec.ts for why this is generous rather
// than tight.
const DRAG_PERSISTED_SANITY_TOLERANCE_PX = 60;

function vectorBetween(a: Position, b: Position): Position {
  return { x: b.x - a.x, y: b.y - a.y };
}

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("shift+click accumulates a multi-selection", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await mainScreen.addTable("Orders");

  await mainScreen.shiftClickSelect(["Users", "Orders"]);

  expect(await mainScreen.selectedTableNodeCount()).toBe(2);
});

test("rubber-band drag over the pane selects the enclosed tables", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await mainScreen.addTable("Orders");

  const paneBox = await mainScreen.paneBoundingBox();
  expect(paneBox).not.toBeNull();

  // Both newly-created tables sit near the pane's top-left corner. Start
  // the drag well below them and clear of React Flow's own bottom-corner
  // panels (MiniMap, Controls, Attribution), which would otherwise swallow
  // the mousedown and silently no-op the whole gesture; end near the
  // pane's top-left corner so both tables end up enclosed.
  await mainScreen.boxSelectPane(
    { x: paneBox!.x + paneBox!.width / 2, y: paneBox!.y + 300 },
    { x: paneBox!.x + 5, y: paneBox!.y + 5 },
  );

  expect(await mainScreen.selectedTableNodeCount()).toBe(2);
});

test("dragging one selected table moves the whole selection together", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await mainScreen.addTable("Orders");
  await mainScreen.shiftClickSelect(["Users", "Orders"]);

  const usersBefore = await mainScreen.tableNodeBoundingBox("Users");
  const ordersBefore = await mainScreen.tableNodeBoundingBox("Orders");
  expect(usersBefore).not.toBeNull();
  expect(ordersBefore).not.toBeNull();

  await mainScreen.dragTableNode("Users", 120, 60);

  const usersAfterDrag = await mainScreen.tableNodeBoundingBox("Users");
  const ordersAfterDrag = await mainScreen.tableNodeBoundingBox("Orders");
  expect(usersAfterDrag).not.toBeNull();
  expect(ordersAfterDrag).not.toBeNull();

  // Sanity check: a drag actually happened.
  expect(distance(usersBefore!, usersAfterDrag!)).toBeGreaterThan(MIN_DRAG_DISTANCE_PX);

  // The whole selection moved together: the offset between the two tables
  // is preserved by the live drag. Empirically exact (not approximate) —
  // both nodes are driven by the same drag gesture in the same render.
  expect(vectorBetween(usersAfterDrag!, ordersAfterDrag!)).toEqual(
    vectorBetween(usersBefore!, ordersBefore!),
  );

  await page.reload();
  const usersAfterReload1 = await mainScreen.tableNodeBoundingBox("Users");
  const ordersAfterReload1 = await mainScreen.tableNodeBoundingBox("Orders");
  expect(usersAfterReload1).not.toBeNull();
  expect(ordersAfterReload1).not.toBeNull();

  expect(distance(usersAfterDrag!, usersAfterReload1!)).toBeLessThanOrEqual(
    DRAG_PERSISTED_SANITY_TOLERANCE_PX,
  );
  expect(distance(ordersAfterDrag!, ordersAfterReload1!)).toBeLessThanOrEqual(
    DRAG_PERSISTED_SANITY_TOLERANCE_PX,
  );

  // The real persistence check: comparing two post-reload renders (both
  // derived purely from storage) instead of the live drag render against a
  // reload — see table-creation-and-drag.spec.ts. Confirmed empirically
  // stable at 0px for both nodes across 40+ runs under full parallel load.
  await page.reload();
  const usersAfterReload2 = await mainScreen.tableNodeBoundingBox("Users");
  const ordersAfterReload2 = await mainScreen.tableNodeBoundingBox("Orders");
  expect(usersAfterReload2).toEqual(usersAfterReload1);
  expect(ordersAfterReload2).toEqual(ordersAfterReload1);
});
