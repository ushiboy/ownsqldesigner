import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("editing a parent column's type propagates to its foreign-key child column", async ({
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

  expect(await mainScreen.sidePanel.columnType("user_id")).toBe("TEXT");

  await mainScreen.selectTable("Users");
  await mainScreen.sidePanel.editColumnType("id", "INTEGER");

  await mainScreen.selectTable("Orders");
  expect(await mainScreen.sidePanel.columnType("user_id")).toBe("INTEGER");
});
