import { test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("dragging from a child column to a parent's key column creates a foreign key relation", async () => {
  // Create a "Users" table via the toolbar's Add Table dialog
  // Select the "Users" table node
  // Open the side panel
  // Add a primary-key column named "id" to "Users"
  // Create an "Orders" table
  // Select the "Orders" table node
  // Add a (non-primary-key) column named "user_id" to "Orders"
  // Drag from the "Orders.user_id" column's source connection handle to
  // the "Users.id" column's target connection handle
  // Verify: exactly one edge now exists on the canvas
  // Select the "Orders" table again
  // Verify: the side panel's relation list contains "user_id → Users.id"
});
