import type { Locator, Page } from "@playwright/test";

type AddColumnFields = {
  name: string;
  primaryKey?: boolean;
};

const EDIT_COLUMN_LABEL_PATTERN = /^Edit column /i;
const EDIT_KEY_LABEL_PATTERN = /^Edit key /i;

/** Wraps the toolbar and canvas: table creation, drag, multi-select, and FK connection gestures. */
export class MainScreenPage {
  private readonly page: Page;
  readonly sidePanel: SidePanel;

  constructor(page: Page) {
    this.page = page;
    this.sidePanel = new SidePanel(page);
  }

  tableNode(name: string): Locator {
    return this.page.getByRole("button", { name: `Table ${name}` });
  }

  async addTable(name: string): Promise<void> {
    await this.page.getByRole("button", { name: "Add Table" }).click();
    const dialog = this.page.getByRole("dialog", { name: "New Table" });
    await dialog.getByLabel("Table name").fill(name);
    await dialog.getByRole("button", { name: "Create" }).click();
    await dialog.waitFor({ state: "hidden" });
  }

  async selectTable(name: string): Promise<void> {
    await this.tableNode(name).click();
  }

  // Each click must complete before the next starts: the first establishes
  // the selection and every later one brackets its own click with Shift
  // down/up, so this loop's awaits cannot be parallelized.
  /* eslint-disable no-await-in-loop */
  async shiftClickSelect(names: string[]): Promise<void> {
    for (const [index, name] of names.entries()) {
      if (index === 0) {
        await this.tableNode(name).click();
        continue;
      }
      await this.page.keyboard.down("Shift");
      await this.tableNode(name).click();
      await this.page.keyboard.up("Shift");
    }
  }
  /* eslint-enable no-await-in-loop */

  async selectedTableNodeCount(): Promise<number> {
    return this.page.locator(".react-flow__node.selected").count();
  }

  async openSidePanel(): Promise<void> {
    const toggle = this.page.getByRole("button", { name: "Toggle side panel" });
    if ((await toggle.getAttribute("aria-pressed")) !== "true") {
      await toggle.click();
    }
  }

  tableColumnRow(tableName: string, columnName: string): Locator {
    return this.tableNode(tableName).locator("li").filter({ hasText: columnName });
  }
}

/** The table detail side panel nested within the main screen: column management and the relation list. */
class SidePanel {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get panel(): Locator {
    return this.page.getByRole("complementary", { name: "Side panel" });
  }

  async addColumn(fields: AddColumnFields): Promise<void> {
    await this.panel.getByRole("button", { name: "Add Column" }).click();
    const dialog = this.page.getByRole("dialog", { name: "Add Column" });
    await dialog.getByLabel("Name").fill(fields.name);
    if (fields.primaryKey === true) {
      await dialog.getByRole("checkbox", { name: "Primary Key" }).check();
    }
    await dialog.getByRole("button", { name: "Add" }).click();
    await dialog.waitFor({ state: "hidden" });
  }

  async columnNames(): Promise<string[]> {
    const labels = await this.panel
      .getByRole("button", { name: EDIT_COLUMN_LABEL_PATTERN })
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-label") ?? ""),
      );
    return labels.map((label) => label.replace(EDIT_COLUMN_LABEL_PATTERN, ""));
  }

  async keyLabels(): Promise<string[]> {
    const labels = await this.panel
      .getByRole("button", { name: EDIT_KEY_LABEL_PATTERN })
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-label") ?? ""),
      );
    return labels.map((label) => label.replace(EDIT_KEY_LABEL_PATTERN, ""));
  }
}
