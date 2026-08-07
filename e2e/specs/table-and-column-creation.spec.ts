import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("adding a table and its columns is reflected on the canvas node and in the side panel", async ({
  page,
}) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await expect(mainScreen.tableNode("Users")).toBeVisible();

  await mainScreen.selectTable("Users");
  await mainScreen.openSidePanel();

  await mainScreen.sidePanel.addColumn({ name: "id", primaryKey: true });
  await mainScreen.sidePanel.addColumn({ name: "name" });

  await expect(mainScreen.tableColumnRow("Users", "id")).toBeVisible();
  await expect(mainScreen.tableColumnRow("Users", "name")).toBeVisible();

  expect(await mainScreen.sidePanel.columnNames()).toEqual(["id", "name"]);
  expect(await mainScreen.sidePanel.keyLabels()).toEqual(["PRIMARY KEY (id)"]);
});
