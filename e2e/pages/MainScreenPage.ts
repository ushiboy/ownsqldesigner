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

  // Starting a key-handle drag (onConnectStart) triggers a canvas viewport
  // shift to accommodate the drop-target hint overlays that appear on every
  // table card (see TableNode.tsx's dropHint) — confirmed empirically by
  // reading a card's rect mid-drag and seeing it differ from a pre-drag
  // read. The shift can still be in progress after the first move lands
  // (a single correction pass measurably reduced but didn't eliminate
  // misses under full parallel load), so keep re-reading the same target
  // and correcting toward it — with a fast, few-step move each time so a
  // correction doesn't itself get outrun by an ongoing shift — until two
  // consecutive reads agree or a generous attempt budget is spent.
  private async moveToTarget(target: Locator, description: string): Promise<void> {
    const box = await target.boundingBox();
    if (box === null) {
      throw new Error(`${description} is not visible`);
    }
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });

    let last = box;
    /* eslint-disable no-await-in-loop */
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const current = await target.boundingBox();
      if (current === null) {
        throw new Error(`${description} is not visible`);
      }
      if (current.x === last.x && current.y === last.y) {
        return;
      }
      last = current;
      await this.page.mouse.move(current.x + current.width / 2, current.y + current.height / 2, {
        steps: 3,
      });
    }
    /* eslint-enable no-await-in-loop */
  }

  private async pressKeyHandle(parent: { table: string; column: string }): Promise<void> {
    const keyHandle = this.tableColumnRow(parent.table, parent.column).locator(
      '.react-flow__handle[data-handleid^="target:"]',
    );
    const keyBox = await keyHandle.boundingBox();
    if (keyBox === null) {
      throw new Error("Could not locate key handle");
    }
    await this.page.mouse.move(keyBox.x + keyBox.width / 2, keyBox.y + keyBox.height / 2);
    await this.page.mouse.down();
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

  undoButton(): Locator {
    return this.page.getByRole("button", { name: "Undo" });
  }

  redoButton(): Locator {
    return this.page.getByRole("button", { name: "Redo" });
  }

  async undo(): Promise<void> {
    await this.undoButton().click();
  }

  async redo(): Promise<void> {
    await this.redoButton().click();
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

  selectedTableNodes(): Locator {
    return this.page.locator(".react-flow__node.selected");
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

  async toggleSnapToGrid(): Promise<void> {
    await this.page.getByRole("button", { name: "Toggle snap to grid" }).click();
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

  /**
   * REQ-016 "new column" branch: drags from the parent's key/target handle
   * and drops on `childTable`'s card body (not a handle), which
   * auto-generates a new child column there. `childTable` must have zero
   * columns at drop time — TableNode renders no <Handle> elements for an
   * empty table, so its whole bounding box is safe to drop on.
   */
  async dragFromKeyHandleToTableBody(
    parent: { table: string; column: string },
    childTable: string,
  ): Promise<void> {
    await this.pressKeyHandle(parent);
    await this.moveToTarget(this.tableNode(childTable), `Table node "${childTable}"`);
    await this.page.mouse.up();
  }

  /**
   * REQ-016 "existing column" branch: drags from the parent's key/target
   * handle and drops precisely on `child`'s own source handle, linking that
   * existing column as the foreign key's child instead of creating a new one.
   */
  async dragFromKeyHandleToColumn(
    parent: { table: string; column: string },
    child: { table: string; column: string },
  ): Promise<void> {
    const sourceHandle = this.tableColumnRow(child.table, child.column).locator(
      '.react-flow__handle[data-handleid^="source:"]',
    );
    await this.pressKeyHandle(parent);
    await this.moveToTarget(sourceHandle, `Source handle for ${child.table}.${child.column}`);
    await this.page.mouse.up();
  }

  edges(): Locator {
    return this.page.locator(".react-flow__edge");
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

  async editColumnType(name: string, type: string): Promise<void> {
    await this.panel.getByRole("button", { name: `Edit column ${name}` }).click();
    const dialog = this.page.getByRole("dialog", { name: "Edit Column" });
    await dialog.getByLabel("Type").selectOption(type);
    await dialog.getByRole("button", { name: "Save" }).click();
    await dialog.waitFor({ state: "hidden" });
  }

  /** Reads a column's current type through the Edit Column dialog, then cancels without saving. */
  async columnType(name: string): Promise<string> {
    await this.panel.getByRole("button", { name: `Edit column ${name}` }).click();
    const dialog = this.page.getByRole("dialog", { name: "Edit Column" });
    const type = await dialog.getByLabel("Type").inputValue();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await dialog.waitFor({ state: "hidden" });
    return type;
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
