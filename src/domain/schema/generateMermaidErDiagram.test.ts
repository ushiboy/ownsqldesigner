import { generateMermaidErDiagram } from "./generateMermaidErDiagram";
import type { Column, ForeignKey, Key, Table } from "./types";

const BASE_COLUMN: Column = {
  id: "",
  name: "",
  type: "TEXT",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

function column(fields: Partial<Column>): Column {
  return { ...BASE_COLUMN, ...fields };
}

function table(fields: Partial<Table> & Pick<Table, "id" | "name">): Table {
  return {
    comment: "",
    position: { x: 0, y: 0 },
    columns: [],
    keys: [],
    foreignKeys: [],
    ...fields,
  };
}

function key(fields: Partial<Key> & Pick<Key, "type" | "columnIds">): Key {
  return { id: "", ...fields };
}

function foreignKey(fields: Omit<ForeignKey, "id">): ForeignKey {
  return { id: "", ...fields };
}

describe("generateMermaidErDiagram", () => {
  it("returns an empty string for a schema with no tables", () => {
    expect(generateMermaidErDiagram([])).toBe("");
  });

  it("generates an entity block with plain, unmarked attributes", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "email" }), column({ id: "c2", name: "nickname" })],
    });

    expect(generateMermaidErDiagram([users])).toBe(
      "erDiagram\n  users {\n    TEXT email\n    TEXT nickname\n  }",
    );
  });

  it("marks a PRIMARY_KEY column's attribute with PK", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "id", type: "INTEGER" })],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1"] })],
    });

    expect(generateMermaidErDiagram([users])).toBe("erDiagram\n  users {\n    INTEGER id PK\n  }");
  });

  it("marks a UNIQUE column's attribute with UK", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "email" })],
      keys: [key({ type: "UNIQUE", columnIds: ["c1"] })],
    });

    expect(generateMermaidErDiagram([users])).toBe("erDiagram\n  users {\n    TEXT email UK\n  }");
  });

  it("marks every column of a composite PRIMARY_KEY with PK", () => {
    const memberships = table({
      id: "t1",
      name: "memberships",
      columns: [
        column({ id: "c1", name: "team_id", type: "INTEGER" }),
        column({ id: "c2", name: "user_id", type: "INTEGER" }),
      ],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1", "c2"] })],
    });

    expect(generateMermaidErDiagram([memberships])).toBe(
      "erDiagram\n  memberships {\n    INTEGER team_id PK\n    INTEGER user_id PK\n  }",
    );
  });

  it("renders a one-to-many relationship for a foreign key whose column isn't itself unique", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "id", type: "INTEGER" })],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1"] })],
    });
    const posts = table({
      id: "t2",
      name: "posts",
      columns: [column({ id: "c2", name: "user_id", type: "INTEGER" })],
      foreignKeys: [
        foreignKey({ columnId: "c2", referencedTableId: "t1", referencedColumnId: "c1" }),
      ],
    });

    expect(generateMermaidErDiagram([users, posts])).toBe(
      "erDiagram\n" +
        "  users {\n    INTEGER id PK\n  }\n" +
        "  posts {\n    INTEGER user_id FK\n  }\n" +
        '  users ||--o{ posts : "user_id"',
    );
  });

  it("renders a one-to-one relationship when the foreign key column is itself the child's primary key", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "id", type: "INTEGER" })],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1"] })],
    });
    const accounts = table({
      id: "t2",
      name: "accounts",
      columns: [column({ id: "c2", name: "user_id", type: "INTEGER" })],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c2"] })],
      foreignKeys: [
        foreignKey({ columnId: "c2", referencedTableId: "t1", referencedColumnId: "c1" }),
      ],
    });

    expect(generateMermaidErDiagram([users, accounts])).toBe(
      "erDiagram\n" +
        "  users {\n    INTEGER id PK\n  }\n" +
        "  accounts {\n    INTEGER user_id PK,FK\n  }\n" +
        '  users ||--|| accounts : "user_id"',
    );
  });

  it("replaces spaces in a multi-word column type with underscores", () => {
    const accounts = table({
      id: "t1",
      name: "accounts",
      columns: [column({ id: "c1", name: "balance", type: "DOUBLE PRECISION" })],
    });

    expect(generateMermaidErDiagram([accounts])).toBe(
      "erDiagram\n  accounts {\n    DOUBLE_PRECISION balance\n  }",
    );
  });

  it("combines size, precision, not-null, and the column comment into a quoted attribute comment", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [
        column({
          id: "c1",
          name: "code",
          type: "VARCHAR",
          size: "255",
          precision: "2",
          nullable: false,
          comment: "internal code",
        }),
      ],
    });

    expect(generateMermaidErDiagram([users])).toBe(
      'erDiagram\n  users {\n    VARCHAR code "size=255, precision=2, not null, internal code"\n  }',
    );
  });

  it("replaces a double quote in a column comment with a single quote", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "name", comment: 'the "display" name' })],
    });

    expect(generateMermaidErDiagram([users])).toBe(
      "erDiagram\n  users {\n    TEXT name \"the 'display' name\"\n  }",
    );
  });

  it("joins multiple entity blocks with newlines, followed by relationship lines", () => {
    const a = table({ id: "t1", name: "a" });
    const b = table({ id: "t2", name: "b" });

    expect(generateMermaidErDiagram([a, b])).toBe("erDiagram\n  a {\n  }\n  b {\n  }");
  });
});
