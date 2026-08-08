import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("dragging from a child column to a parent's key column creates a foreign key relation", async ({
  page,
}) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await mainScreen.selectTable("Users");
  await mainScreen.openSidePanel();
  await mainScreen.sidePanel.addColumn({ name: "id", primaryKey: true });

  await mainScreen.addTable("Orders");
  await mainScreen.selectTable("Orders");
  await mainScreen.sidePanel.addColumn({ name: "user_id" });

  await mainScreen.connectColumns(
    { table: "Orders", column: "user_id" },
    { table: "Users", column: "id" },
  );

  await expect(mainScreen.edges()).toHaveCount(1);

  await mainScreen.selectTable("Orders");
  const relationLabels = await mainScreen.sidePanel.relationLabels();
  expect(relationLabels).toContain("user_id → Users.id");
});
