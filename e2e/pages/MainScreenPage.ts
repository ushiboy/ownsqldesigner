import type { Locator, Page } from "@playwright/test";

type BoundingBox = { x: number; y: number; width: number; height: number };

type AddColumnFields = {
  name: string;
  primaryKey?: boolean;
};

const EDIT_COLUMN_LABEL_PATTERN = /^Edit column /i;
const EDIT_KEY_LABEL_PATTERN = /^Edit key /i;
const DELETE_RELATION_LABEL_PATTERN = /^Delete relation /i;

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

  async tableNodeBoundingBox(name: string): Promise<BoundingBox | null> {
    return this.tableNode(name).boundingBox();
  }

  async dragTableNode(name: string, dx: number, dy: number): Promise<void> {
    const box = await this.tableNodeBoundingBox(name);
    if (box === null) {
      throw new Error(`Table node "${name}" is not visible`);
    }
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 10 });
    await this.page.mouse.up();
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

  paneBoundingBox(): Promise<BoundingBox | null> {
    return this.page.locator(".react-flow__pane").boundingBox();
  }

  async boxSelectPane(from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
    await this.page.keyboard.down("Shift");
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(to.x, to.y, { steps: 10 });
    await this.page.mouse.up();
    await this.page.keyboard.up("Shift");
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

  async connectColumns(
    child: { table: string; column: string },
    parent: { table: string; column: string },
  ): Promise<void> {
    const sourceHandle = this.tableColumnRow(child.table, child.column).locator(
      '.react-flow__handle[data-handleid^="source:"]',
    );
    const targetHandle = this.tableColumnRow(parent.table, parent.column).locator(
      '.react-flow__handle[data-handleid^="target:"]',
    );
    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();
    if (sourceBox === null || targetBox === null) {
      throw new Error("Could not locate connection handles");
    }
    const sourceX = sourceBox.x + sourceBox.width / 2;
    const sourceY = sourceBox.y + sourceBox.height / 2;
    const targetX = targetBox.x + targetBox.width / 2;
    const targetY = targetBox.y + targetBox.height / 2;
    await this.page.mouse.move(sourceX, sourceY);
    await this.page.mouse.down();
    await this.page.mouse.move(targetX, targetY, { steps: 10 });
    await this.page.mouse.up();
  }

  async edgeCount(): Promise<number> {
    return this.page.locator(".react-flow__edge").count();
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

  async relationLabels(): Promise<string[]> {
    const labels = await this.panel
      .getByRole("button", { name: DELETE_RELATION_LABEL_PATTERN })
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-label") ?? ""),
      );
    return labels.map((label) => label.replace(DELETE_RELATION_LABEL_PATTERN, ""));
  }
}
