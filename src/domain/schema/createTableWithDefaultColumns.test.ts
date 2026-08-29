import { createTableWithDefaultColumns } from "./createTableWithDefaultColumns";
import type { DefaultColumnTemplate } from "./defaultColumnTemplate";
import { EMPTY_COLUMN_KEY_MEMBERSHIP, type ColumnKeyMembership } from "./key";
import { createSchema, createTable } from "./table";
import type { KeyType } from "./types";

const now = new Date("2026-08-29T09:00:00.000Z");

function buildTemplate(overrides: Partial<DefaultColumnTemplate>): DefaultColumnTemplate {
  return {
    id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
    name: "id",
    type: "INTEGER",
    size: "",
    precision: "",
    defaultValue: "",
    nullable: false,
    autoIncrement: false,
    comment: "",
    keyMembership: EMPTY_COLUMN_KEY_MEMBERSHIP,
    ...overrides,
  };
}

function soleKeyMembership(type: KeyType): ColumnKeyMembership {
  return { ...EMPTY_COLUMN_KEY_MEMBERSHIP, [type]: true };
}

describe("createTableWithDefaultColumns", () => {
  it("creates a plain table when there are no templates", () => {
    const schema = createSchema("Blog Schema");
    const options = { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", now };

    const result = createTableWithDefaultColumns(schema, "posts", [], options);

    expect(result.tables).toEqual(createTable(schema, "posts", options).tables);
  });

  it("does nothing when the table name is already taken", () => {
    const withPosts = createTable(createSchema("Blog Schema"), "posts");

    const result = createTableWithDefaultColumns(withPosts, "posts", [
      buildTemplate({ name: "created_at" }),
    ]);

    expect(result).toBe(withPosts);
  });

  it("appends a plain column template with no key", () => {
    const schema = createSchema("Blog Schema");

    const result = createTableWithDefaultColumns(schema, "posts", [
      buildTemplate({ name: "created_at", type: "TEXT", nullable: false }),
    ]);

    expect(result.tables[0]?.columns).toMatchObject([{ name: "created_at", type: "TEXT" }]);
    expect(result.tables[0]?.keys).toEqual([]);
  });

  it("adds a PRIMARY KEY + auto-increment column and creates its key", () => {
    const schema = createSchema("Blog Schema", { dialect: "sqlite" });

    const result = createTableWithDefaultColumns(schema, "posts", [
      buildTemplate({
        name: "id",
        type: "INTEGER",
        autoIncrement: true,
        keyMembership: soleKeyMembership("PRIMARY_KEY"),
      }),
    ]);

    const table = result.tables[0]!;
    expect(table.columns).toMatchObject([{ name: "id", autoIncrement: true }]);
    expect(table.keys).toMatchObject([{ type: "PRIMARY_KEY", columnIds: [table.columns[0]!.id] }]);
  });

  it("adds a UNIQUE column template and creates its key", () => {
    const schema = createSchema("Blog Schema");

    const result = createTableWithDefaultColumns(schema, "posts", [
      buildTemplate({ name: "slug", type: "TEXT", keyMembership: soleKeyMembership("UNIQUE") }),
    ]);

    const table = result.tables[0]!;
    expect(table.keys).toMatchObject([{ type: "UNIQUE", columnIds: [table.columns[0]!.id] }]);
  });

  it("creates both a UNIQUE and an INDEX key for a column owning both", () => {
    const schema = createSchema("Blog Schema");

    const result = createTableWithDefaultColumns(schema, "posts", [
      buildTemplate({
        name: "slug",
        type: "TEXT",
        keyMembership: { PRIMARY_KEY: false, UNIQUE: true, INDEX: true },
      }),
    ]);

    const table = result.tables[0]!;
    expect(table.keys.map((key) => key.type).toSorted()).toEqual(["INDEX", "UNIQUE"]);
  });

  it("applies multiple templates in order", () => {
    const schema = createSchema("Blog Schema");

    const result = createTableWithDefaultColumns(schema, "posts", [
      buildTemplate({
        name: "id",
        type: "INTEGER",
        autoIncrement: true,
        keyMembership: soleKeyMembership("PRIMARY_KEY"),
      }),
      buildTemplate({ id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12", name: "created_at" }),
      buildTemplate({ id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", name: "updated_at" }),
    ]);

    expect(result.tables[0]?.columns.map((column) => column.name)).toEqual([
      "id",
      "created_at",
      "updated_at",
    ]);
  });

  it("ignores a second PRIMARY_KEY template, keeping only the first", () => {
    const schema = createSchema("Blog Schema");

    const result = createTableWithDefaultColumns(schema, "posts", [
      buildTemplate({ name: "id", keyMembership: soleKeyMembership("PRIMARY_KEY") }),
      buildTemplate({
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        name: "other_id",
        keyMembership: soleKeyMembership("PRIMARY_KEY"),
      }),
    ]);

    const table = result.tables[0]!;
    expect(table.keys.filter((key) => key.type === "PRIMARY_KEY")).toHaveLength(1);
    expect(table.columns.map((column) => column.name)).toEqual(["id", "other_id"]);
  });

  it("clears auto-increment on a second PRIMARY_KEY template whose key was rejected", () => {
    const schema = createSchema("Blog Schema", { dialect: "sqlite" });

    const result = createTableWithDefaultColumns(schema, "posts", [
      buildTemplate({
        name: "id",
        type: "INTEGER",
        autoIncrement: true,
        keyMembership: soleKeyMembership("PRIMARY_KEY"),
      }),
      buildTemplate({
        id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        name: "other_id",
        type: "INTEGER",
        autoIncrement: true,
        keyMembership: soleKeyMembership("PRIMARY_KEY"),
      }),
    ]);

    const table = result.tables[0]!;
    expect(table.columns.find((column) => column.name === "other_id")?.autoIncrement).toBe(false);
  });

  it("uses the injected id and time for the created table", () => {
    const schema = createSchema("Blog Schema");

    const result = createTableWithDefaultColumns(schema, "posts", [], {
      id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      now,
    });

    expect(result.tables[0]?.id).toBe("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");
    expect(result.updatedAt).toEqual(now);
  });
});
