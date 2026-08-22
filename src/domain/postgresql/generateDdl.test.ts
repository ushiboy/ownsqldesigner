import type { Column, ForeignKey, Key, Table } from "../schema";
import { generatePostgresqlDdl } from "./generateDdl";

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

describe("generatePostgresqlDdl", () => {
  it("returns an empty string for a schema with no tables", () => {
    expect(generatePostgresqlDdl([])).toBe("");
  });

  it("generates a plain CREATE TABLE with NOT NULL for non-nullable columns", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [
        column({ id: "c1", name: "email", nullable: false }),
        column({ id: "c2", name: "nickname", nullable: true }),
      ],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  email TEXT NOT NULL,\n  nickname TEXT\n);",
    );
  });

  it("includes a declared size in parentheses", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "code", type: "VARCHAR", size: "8" })],
    });

    expect(generatePostgresqlDdl([users])).toBe("CREATE TABLE users (\n  code VARCHAR(8)\n);");
  });

  it("includes a declared precision in parentheses", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "created_at", type: "TIMESTAMP", precision: "3" })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  created_at TIMESTAMP(3)\n);",
    );
  });

  it("renders an identity column and still emits a table-level PRIMARY KEY", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [
        column({ id: "c1", name: "id", type: "INTEGER", nullable: false, autoIncrement: true }),
      ],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1"] })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,\n  PRIMARY KEY (id)\n);",
    );
  });

  it("omits DEFAULT on an identity column, since PostgreSQL rejects the combination", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [
        column({
          id: "c1",
          name: "id",
          type: "INTEGER",
          nullable: false,
          autoIncrement: true,
          defaultValue: "1",
        }),
      ],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1"] })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,\n  PRIMARY KEY (id)\n);",
    );
  });

  it("renders a non-autoincrement PRIMARY KEY as a table-level constraint", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "id", type: "INTEGER", nullable: false })],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1"] })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  id INTEGER NOT NULL,\n  PRIMARY KEY (id)\n);",
    );
  });

  it("renders a composite PRIMARY KEY with columns in stored order", () => {
    const memberships = table({
      id: "t1",
      name: "memberships",
      columns: [
        column({ id: "c1", name: "team_id", type: "INTEGER", nullable: false }),
        column({ id: "c2", name: "user_id", type: "INTEGER", nullable: false }),
      ],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c2", "c1"] })],
    });

    expect(generatePostgresqlDdl([memberships])).toBe(
      "CREATE TABLE memberships (\n  team_id INTEGER NOT NULL,\n  user_id INTEGER NOT NULL,\n  PRIMARY KEY (user_id, team_id)\n);",
    );
  });

  it("renders a UNIQUE key as a table-level constraint", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "email", nullable: false })],
      keys: [key({ type: "UNIQUE", columnIds: ["c1"] })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  email TEXT NOT NULL,\n  UNIQUE (email)\n);",
    );
  });

  it("renders a FOREIGN KEY referencing another table's column", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "id", type: "INTEGER", nullable: false })],
      keys: [key({ type: "PRIMARY_KEY", columnIds: ["c1"] })],
    });
    const posts = table({
      id: "t2",
      name: "posts",
      columns: [column({ id: "c2", name: "user_id", type: "INTEGER", nullable: false })],
      foreignKeys: [
        foreignKey({ columnId: "c2", referencedTableId: "t1", referencedColumnId: "c1" }),
      ],
    });

    const ddl = generatePostgresqlDdl([users, posts]);

    expect(ddl).toContain(
      "CREATE TABLE posts (\n  user_id INTEGER NOT NULL,\n  FOREIGN KEY (user_id) REFERENCES users(id)\n);",
    );
  });

  it("emits a numeric DEFAULT value raw", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "score", type: "INTEGER", defaultValue: "0" })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  score INTEGER DEFAULT 0\n);",
    );
  });

  it("emits a non-numeric DEFAULT value as a quoted string literal", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "status", defaultValue: "active" })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  status TEXT DEFAULT 'active'\n);",
    );
  });

  it("doubles an embedded single quote in a DEFAULT string literal", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "name", defaultValue: "O'Brien" })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  name TEXT DEFAULT 'O''Brien'\n);",
    );
  });

  it("emits a recognized SQL keyword DEFAULT value unquoted (0043)", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [
        column({ id: "c1", name: "created_at", type: "TEXT", defaultValue: "CURRENT_TIMESTAMP" }),
      ],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n);",
    );
  });

  it("generates one CREATE INDEX statement per INDEX key, after all CREATE TABLE statements", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "last_name" }), column({ id: "c2", name: "first_name" })],
      keys: [key({ type: "INDEX", columnIds: ["c1", "c2"] })],
    });

    expect(generatePostgresqlDdl([users])).toBe(
      "CREATE TABLE users (\n  last_name TEXT,\n  first_name TEXT\n);\n\n" +
        "CREATE INDEX idx_users_last_name_first_name ON users (last_name, first_name);",
    );
  });

  it("deduplicates CREATE INDEX names when two indexes share the same columns", () => {
    const users = table({
      id: "t1",
      name: "users",
      columns: [column({ id: "c1", name: "email" })],
      keys: [
        key({ id: "k1", type: "INDEX", columnIds: ["c1"] }),
        key({ id: "k2", type: "INDEX", columnIds: ["c1"] }),
      ],
    });

    const ddl = generatePostgresqlDdl([users]);

    expect(ddl).toContain("CREATE INDEX idx_users_email ON users (email);");
    expect(ddl).toContain("CREATE INDEX idx_users_email_2 ON users (email);");
  });

  it("joins multiple CREATE TABLE statements with a blank line", () => {
    const users = table({ id: "t1", name: "users" });
    const posts = table({ id: "t2", name: "posts" });

    expect(generatePostgresqlDdl([users, posts])).toBe(
      "CREATE TABLE users (\n\n);\n\nCREATE TABLE posts (\n\n);",
    );
  });
});
