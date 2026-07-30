import { addForeignKey } from "./foreignKey";
import { importSchema, isSchemaIntegrityValid, parseSchemaFile } from "./integrity";
import { createSchema } from "./table";
import {
  POSTS_TABLE_ID,
  POSTS_USER_ID_COLUMN_ID,
  USERS_EMAIL_COLUMN_ID,
  USERS_ID_COLUMN_ID,
  USERS_ID_KEY_ID,
  USERS_TABLE_ID,
  buildTwoTableSchema,
  columnFields,
  getTable,
  withTable,
} from "./test-fixtures";
import type { Schema } from "./types";

describe("isSchemaIntegrityValid", () => {
  it("is true for a schema built entirely through the domain mutators", () => {
    const withForeignKey = addForeignKey(buildTwoTableSchema(), POSTS_TABLE_ID, {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    });

    expect(isSchemaIntegrityValid(withForeignKey)).toBe(true);
  });

  it("is false when two tables share a name, case-insensitively", () => {
    const schema = buildTwoTableSchema();
    const duplicated: Schema = {
      ...schema,
      tables: [
        ...schema.tables,
        { ...getTable(schema, POSTS_TABLE_ID), id: "new-table-id", name: "Users" },
      ],
    };

    expect(isSchemaIntegrityValid(duplicated)).toBe(false);
  });

  it("is false when two columns on the same table share a name, case-insensitively", () => {
    const schema = buildTwoTableSchema();
    const users = getTable(schema, USERS_TABLE_ID);
    const duplicated = withTable(schema, USERS_TABLE_ID, {
      columns: [...users.columns, { ...columnFields, id: "new-col-id", name: "Email" }],
    });

    expect(isSchemaIntegrityValid(duplicated)).toBe(false);
  });

  it("is false for an invalid identifier name", () => {
    const schema = buildTwoTableSchema();
    const invalidName = withTable(schema, USERS_TABLE_ID, { name: "1users" });

    expect(isSchemaIntegrityValid(invalidName)).toBe(false);
  });

  it("is false when a table has two PRIMARY_KEY keys", () => {
    const schema = buildTwoTableSchema();
    const twoPrimaryKeys = withTable(schema, USERS_TABLE_ID, {
      keys: [
        { id: USERS_ID_KEY_ID, type: "PRIMARY_KEY", columnIds: [USERS_ID_COLUMN_ID] },
        { id: "second-pk-id", type: "PRIMARY_KEY", columnIds: [USERS_EMAIL_COLUMN_ID] },
      ],
    });

    expect(isSchemaIntegrityValid(twoPrimaryKeys)).toBe(false);
  });

  it("is false when a key references a nonexistent column", () => {
    const schema = buildTwoTableSchema();
    const danglingKey = withTable(schema, USERS_TABLE_ID, {
      keys: [{ id: "dangling-key-id", type: "UNIQUE", columnIds: ["unknown-column-id"] }],
    });

    expect(isSchemaIntegrityValid(danglingKey)).toBe(false);
  });

  it("is false when a foreign key references a nonexistent column", () => {
    const schema = buildTwoTableSchema();
    const danglingForeignKey = withTable(schema, POSTS_TABLE_ID, {
      foreignKeys: [
        {
          id: "dangling-fk-id",
          columnId: POSTS_USER_ID_COLUMN_ID,
          referencedTableId: USERS_TABLE_ID,
          referencedColumnId: "unknown-column-id",
        },
      ],
    });

    expect(isSchemaIntegrityValid(danglingForeignKey)).toBe(false);
  });

  it("is false when a foreign key targets a column that is not a PRIMARY KEY or UNIQUE column (REQ-020)", () => {
    const schema = buildTwoTableSchema();
    const invalidTarget = withTable(schema, POSTS_TABLE_ID, {
      foreignKeys: [
        {
          id: "invalid-target-fk-id",
          columnId: POSTS_USER_ID_COLUMN_ID,
          referencedTableId: USERS_TABLE_ID,
          referencedColumnId: USERS_EMAIL_COLUMN_ID,
        },
      ],
    });

    expect(isSchemaIntegrityValid(invalidTarget)).toBe(false);
  });
});

describe("parseSchemaFile", () => {
  it("parses valid schema JSON text into a Schema", () => {
    const schema = createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    expect(parseSchemaFile(JSON.stringify(schema))).toEqual(schema);
  });

  it("returns null for unparsable text", () => {
    expect(parseSchemaFile("not json")).toBeNull();
  });

  it("returns null for valid JSON that does not match the schema shape", () => {
    expect(parseSchemaFile(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  it("returns null for a structurally valid schema that fails integrity validation", () => {
    const schema = buildTwoTableSchema();
    const withDuplicateTableName = withTable(schema, POSTS_TABLE_ID, { name: "users" });

    expect(parseSchemaFile(JSON.stringify(withDuplicateTableName))).toBeNull();
  });
});

describe("importSchema", () => {
  const original = createSchema("Blog Schema", {
    id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
    now: new Date("2026-07-18T09:00:00.000Z"),
  });

  it("assigns the injected id and bumps createdAt/updatedAt to the injected time", () => {
    const imported = importSchema(original, {
      id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(imported.id).toBe("d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12");
    expect(imported.createdAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
    expect(imported.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("preserves name and tables", () => {
    const imported = importSchema(original, { now: new Date("2026-07-19T09:00:00.000Z") });

    expect(imported.name).toBe(original.name);
    expect(imported.tables).toEqual(original.tables);
  });

  it("does not mutate the input schema", () => {
    importSchema(original, { id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12" });

    expect(original.id).toBe("c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01");
  });
});
