import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("deletes the selected table via the side panel's delete button", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await expect(mainScreen.tableNode("Users")).toBeVisible();

  await mainScreen.openSidePanel();
  await mainScreen.deleteTableViaSidePanel("Users");

  await expect(mainScreen.tableNode("Users")).not.toBeVisible();
});

test("deletes the selected table via the Delete keyboard shortcut", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await mainScreen.selectTable("Users");
  await expect(mainScreen.tableNode("Users")).toBeVisible();

  await mainScreen.deleteSelectedTableViaKeyboard();

  await expect(mainScreen.tableNode("Users")).not.toBeVisible();
});

test("deleting a referenced table removes the dangling foreign-key relation", async ({ page }) => {
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
  expect(await mainScreen.sidePanel.relationLabels()).toContain("user_id → Users.id");

  await mainScreen.deleteTableViaSidePanel("Users");

  await expect(mainScreen.edges()).toHaveCount(0);
  await mainScreen.selectTable("Orders");
  expect(await mainScreen.sidePanel.relationLabels()).toEqual([]);
});
