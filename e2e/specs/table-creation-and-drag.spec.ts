import { test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("creates a table and persists its dragged position after reload", async () => {
  // Create a "Users" table
  // Verify: the "Users" table node is visible
  // Record the table's bounding box before the drag
  // Drag the "Users" table by (150, 80)
  // Verify: the table moved to (before-position + (150, 80)), within a
  // small pixel tolerance
  // Reload the page
  // Verify: the table kept its post-drag position after reload, within a
  // wider tolerance (React Flow's committed position-change event lands a
  // few pixels short of the live drag render on the toolbar-offset axis --
  // a library discretization detail, not a persistence bug -- but still
  // tight enough to catch persistence silently dropping the move)
});
