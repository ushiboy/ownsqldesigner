import { expect, test } from "@playwright/test";
import { resetAppState } from "../fixtures/cleanStorage.ts";
import { MainScreenPage } from "../pages/MainScreenPage.ts";

test.beforeEach(async ({ page }) => {
  await resetAppState(page);
});

test("dropping a parent's key handle on a table's body auto-generates a foreign-key child column", async ({
  page,
}) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("users");
  await mainScreen.selectTable("users");
  await mainScreen.openSidePanel();
  await mainScreen.sidePanel.addColumn({ name: "id", primaryKey: true });

  await mainScreen.addTable("orders");

  await mainScreen.dragFromKeyHandleToTableBody({ table: "users", column: "id" }, "orders");

  await expect(mainScreen.edges()).toHaveCount(1);

  await mainScreen.selectTable("orders");
  await expect(mainScreen.sidePanel.panel.getByLabel("Name")).toHaveValue("orders");
  const columnNames = await mainScreen.sidePanel.columnNames();
  expect(columnNames).toContain("users_id");
  const relationLabels = await mainScreen.sidePanel.relationLabels();
  expect(relationLabels).toContain("users_id → users.id");
});

test("dropping a parent's key handle precisely on an existing column's handle links that column instead of creating a new one", async ({
  page,
}) => {
  const mainScreen = new MainScreenPage(page);

  await mainScreen.addTable("users");
  await mainScreen.selectTable("users");
  await mainScreen.openSidePanel();
  await mainScreen.sidePanel.addColumn({ name: "id", primaryKey: true });

  await mainScreen.addTable("orders");
  await mainScreen.selectTable("orders");
  await mainScreen.sidePanel.addColumn({ name: "user_id" });

  await mainScreen.dragFromKeyHandleToColumn(
    { table: "users", column: "id" },
    { table: "orders", column: "user_id" },
  );

  await expect(mainScreen.edges()).toHaveCount(1);

  await mainScreen.selectTable("orders");
  await expect(mainScreen.sidePanel.panel.getByLabel("Name")).toHaveValue("orders");
  const columnNames = await mainScreen.sidePanel.columnNames();
  expect(columnNames).toEqual(["user_id"]);
  const relationLabels = await mainScreen.sidePanel.relationLabels();
  expect(relationLabels).toContain("user_id → users.id");
});
