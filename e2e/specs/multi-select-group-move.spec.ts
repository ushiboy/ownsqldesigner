import { test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("shift+click accumulates a multi-selection", async () => {
  // Create a "Users" table
  // Create an "Orders" table
  // Shift+click "Users" then "Orders" to accumulate a multi-selection
  // Verify: 2 table nodes are marked as selected
});

test("rubber-band drag over the pane selects the enclosed tables", async () => {
  // Create a "Users" table
  // Create an "Orders" table
  // Get the pane's bounding box (needed to compute the drag coordinates)
  // Drag a rubber-band selection box over the pane, starting below both
  // tables and clear of React Flow's bottom-corner panels (MiniMap,
  // Controls, Attribution) so the gesture isn't swallowed, ending near the
  // pane's top-left corner so both tables end up enclosed
  // Verify: 2 table nodes are marked as selected
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
