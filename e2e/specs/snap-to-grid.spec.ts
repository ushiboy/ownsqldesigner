import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

// Mirrors nodeChanges.ts's SNAP_GRID_SIZE — not imported, to keep the E2E
// suite decoupled from app source (see 0027's selector-strategy rationale).
const SNAP_GRID_SIZE = 20;

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("dragging a table with snap to grid on persists a grid-aligned position", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await mainScreen.toggleSnapToGrid();

  const before = await mainScreen.tableNodeBoundingBox("Users");
  expect(before).not.toBeNull();

  // dx/dy deliberately not multiples of SNAP_GRID_SIZE, so a passing
  // assertion proves rounding actually happened rather than coincidentally
  // landing on a grid line.
  await mainScreen.dragTableNode("Users", 137, 73);

  await page.reload();
  const afterReload1 = await mainScreen.tableNodeBoundingBox("Users");
  expect(afterReload1).not.toBeNull();

  // Consecutive-reload comparison, same rationale as
  // table-creation-and-drag.spec.ts: both reads are derived purely from
  // storage, so this is stable to 0px, unlike comparing against the live
  // post-drag render.
  await page.reload();
  const afterReload2 = await mainScreen.tableNodeBoundingBox("Users");
  expect(afterReload2).toEqual(afterReload1);

  // The pane's own constant screen offset cancels out in this subtraction,
  // so the screen-pixel delta between two stored positions equals the
  // underlying flow-coordinate delta at zoom 1 — no need to know that offset.
  const dx = afterReload1!.x - before!.x;
  const dy = afterReload1!.y - before!.y;
  expect(Math.round(dx) % SNAP_GRID_SIZE).toBe(0);
  expect(Math.round(dy) % SNAP_GRID_SIZE).toBe(0);
});
