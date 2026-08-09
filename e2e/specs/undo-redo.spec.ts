import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("undoes and redoes a table creation via the toolbar buttons", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await expect(mainScreen.undoButton()).toBeDisabled();
  await expect(mainScreen.redoButton()).toBeDisabled();

  await mainScreen.addTable("Users");
  await expect(mainScreen.tableNode("Users")).toBeVisible();
  await expect(mainScreen.undoButton()).toBeEnabled();
  await expect(mainScreen.redoButton()).toBeDisabled();

  await mainScreen.undo();
  await expect(mainScreen.tableNode("Users")).not.toBeVisible();
  await expect(mainScreen.undoButton()).toBeDisabled();
  await expect(mainScreen.redoButton()).toBeEnabled();

  await mainScreen.redo();
  await expect(mainScreen.tableNode("Users")).toBeVisible();
  await expect(mainScreen.undoButton()).toBeEnabled();
  await expect(mainScreen.redoButton()).toBeDisabled();
});

test("undoes and redoes across two edits via the keyboard shortcut", async ({ page }) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("Users");
  await mainScreen.addTable("Orders");
  await expect(mainScreen.tableNode("Users")).toBeVisible();
  await expect(mainScreen.tableNode("Orders")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+z");
  await expect(mainScreen.tableNode("Orders")).not.toBeVisible();
  await expect(mainScreen.tableNode("Users")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+z");
  await expect(mainScreen.tableNode("Users")).not.toBeVisible();

  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(mainScreen.tableNode("Users")).toBeVisible();
  await expect(mainScreen.tableNode("Orders")).not.toBeVisible();
});
