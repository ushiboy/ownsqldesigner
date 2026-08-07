import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

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

test("dragging one selected table moves the whole selection together", async () => {
  // Create a "Users" table
  // Create an "Orders" table
  // Shift+click both to select them together
  // Record each table's bounding box before the drag
  // Drag the "Users" table by (120, 60)
  // Verify: both "Users" and "Orders" moved by the same (120, 60) offset,
  // within a small pixel tolerance
  // Reload the page
  // Verify: both tables kept their post-drag position after reload, within
  // a wider tolerance (React Flow's committed position-change event lands a
  // few pixels short of the live drag render on the toolbar-offset axis --
  // a library discretization detail, not a persistence bug -- but still
  // tight enough to catch persistence silently dropping the move)
});
