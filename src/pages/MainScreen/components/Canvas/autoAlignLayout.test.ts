import type { ForeignKey, Table } from "../../../../domain/schema";
import { computeAutoAlignedPositions, type NodeSize } from "./autoAlignLayout";

const DEFAULT_SIZE: NodeSize = { width: 200, height: 100 };

function buildTable(id: string, foreignKeys: ForeignKey[] = []): Table {
  return {
    id,
    name: id,
    comment: "",
    position: { x: 0, y: 0 },
    columns: [],
    keys: [],
    foreignKeys,
  };
}

function buildForeignKey(referencedTableId: string): ForeignKey {
  return {
    id: `fk-${referencedTableId}`,
    columnId: "column",
    referencedTableId,
    referencedColumnId: "referenced-column",
  };
}

function uniformSizes(tables: Table[], size: NodeSize = DEFAULT_SIZE): Map<string, NodeSize> {
  return new Map(tables.map((table) => [table.id, size]));
}

function boundingBox(tableId: string, position: { x: number; y: number }, size: NodeSize) {
  return {
    tableId,
    left: position.x,
    right: position.x + size.width,
    top: position.y,
    bottom: position.y + size.height,
  };
}

function overlaps(a: ReturnType<typeof boundingBox>, b: ReturnType<typeof boundingBox>): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

describe("computeAutoAlignedPositions", () => {
  it("places a referencing (child) table to the left of its referenced (parent) table", () => {
    // TableNode always renders a column's FK source handle on its right
    // edge and a target handle on its left edge (see TableNode.tsx), so the
    // child (the FK's source side) must end up left of the parent for the
    // connector to run as a short, direct line instead of looping sideways.
    const parent = buildTable("parent");
    const child = buildTable("child", [buildForeignKey("parent")]);
    const tables = [parent, child];

    const positions = computeAutoAlignedPositions(tables, uniformSizes(tables));

    const parentX = positions.find((p) => p.tableId === "parent")?.position.x;
    const childX = positions.find((p) => p.tableId === "child")?.position.x;
    expect(childX).toBeLessThan(parentX!);
  });

  it("places every table without any two bounding boxes overlapping", () => {
    const users = buildTable("users");
    const products = buildTable("products");
    const orders = buildTable("orders", [buildForeignKey("users"), buildForeignKey("products")]);
    const orderItems = buildTable("order_items", [buildForeignKey("orders")]);
    const isolated = buildTable("isolated");
    const tables = [users, products, orders, orderItems, isolated];
    const sizes = uniformSizes(tables);

    const positions = computeAutoAlignedPositions(tables, sizes);

    const boxes = positions.map(({ tableId, position }) =>
      boundingBox(tableId, position, sizes.get(tableId)!),
    );
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i], boxes[j])).toBe(false);
      }
    }
  });

  it("returns a valid position for a table with a self-referencing foreign key", () => {
    const selfReferencing = buildTable("self", [buildForeignKey("self")]);
    const tables = [selfReferencing];

    const positions = computeAutoAlignedPositions(tables, uniformSizes(tables));

    expect(positions).toEqual([
      { tableId: "self", position: { x: expect.any(Number), y: expect.any(Number) } },
    ]);
  });

  it("still places a table with no foreign key relations", () => {
    const isolated = buildTable("isolated");
    const tables = [isolated];

    const positions = computeAutoAlignedPositions(tables, uniformSizes(tables));

    expect(positions).toEqual([
      { tableId: "isolated", position: { x: expect.any(Number), y: expect.any(Number) } },
    ]);
  });

  it("falls back to the default table footprint for an unmeasured table", () => {
    const tables = [buildTable("unmeasured")];

    const positions = computeAutoAlignedPositions(tables, new Map());

    expect(positions).toEqual([
      { tableId: "unmeasured", position: { x: expect.any(Number), y: expect.any(Number) } },
    ]);
  });
});
