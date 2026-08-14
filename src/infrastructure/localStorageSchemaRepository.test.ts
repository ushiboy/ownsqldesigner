import {
  addColumn,
  addForeignKey,
  addKey,
  createSchema,
  createTable,
  moveTable,
} from "../domain/schema";
import { createLocalStorageSchemaRepository } from "./localStorageSchemaRepository";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const SCHEMA_ID = "11111111-1111-4111-8111-111111111111";
const USERS_TABLE_ID = "22222222-2222-4222-8222-222222222222";
const USERS_ID_COLUMN_ID = "33333333-3333-4333-8333-333333333333";
const USERS_PK_KEY_ID = "44444444-4444-4444-8444-444444444444";
const POSTS_TABLE_ID = "55555555-5555-4555-8555-555555555555";
const POSTS_ID_COLUMN_ID = "66666666-6666-4666-8666-666666666666";
const POSTS_PK_KEY_ID = "77777777-7777-4777-8777-777777777777";
const POSTS_USER_ID_COLUMN_ID = "88888888-8888-4888-8888-888888888888";
const POSTS_USER_FK_ID = "99999999-9999-4999-8999-999999999999";

const COLUMN_DEFAULTS = {
  size: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: false,
  comment: "",
} as const;

function buildFullyPopulatedSchema() {
  let schema = createSchema("Blog Schema", { id: SCHEMA_ID, now: NOW });
  schema = createTable(schema, "users", { id: USERS_TABLE_ID, now: NOW });
  schema = addColumn(
    schema,
    USERS_TABLE_ID,
    { name: "id", type: "INTEGER", ...COLUMN_DEFAULTS },
    { id: USERS_ID_COLUMN_ID, now: NOW },
  );
  schema = addKey(
    schema,
    USERS_TABLE_ID,
    { type: "PRIMARY_KEY", columnIds: [USERS_ID_COLUMN_ID] },
    { id: USERS_PK_KEY_ID, now: NOW },
  );

  schema = createTable(schema, "posts", { id: POSTS_TABLE_ID, now: NOW });
  schema = addColumn(
    schema,
    POSTS_TABLE_ID,
    { name: "id", type: "INTEGER", ...COLUMN_DEFAULTS },
    { id: POSTS_ID_COLUMN_ID, now: NOW },
  );
  schema = addKey(
    schema,
    POSTS_TABLE_ID,
    { type: "PRIMARY_KEY", columnIds: [POSTS_ID_COLUMN_ID] },
    { id: POSTS_PK_KEY_ID, now: NOW },
  );
  schema = addColumn(
    schema,
    POSTS_TABLE_ID,
    { name: "user_id", type: "INTEGER", ...COLUMN_DEFAULTS },
    { id: POSTS_USER_ID_COLUMN_ID, now: NOW },
  );
  schema = addForeignKey(
    schema,
    POSTS_TABLE_ID,
    {
      columnId: POSTS_USER_ID_COLUMN_ID,
      referencedTableId: USERS_TABLE_ID,
      referencedColumnId: USERS_ID_COLUMN_ID,
    },
    { id: POSTS_USER_FK_ID, now: NOW },
  );

  return moveTable(schema, POSTS_TABLE_ID, { x: 400, y: 320 }, { now: NOW });
}

describe("createLocalStorageSchemaRepository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a saved schema through load", async () => {
    const repository = createLocalStorageSchemaRepository();
    const schema = createSchema("Blog Schema");

    await repository.save(schema);

    await expect(repository.load(schema.id)).resolves.toEqual(schema);
  });

  it("round-trips a schema with columns, keys, a foreign key, and a moved table (REQ-024)", async () => {
    const repository = createLocalStorageSchemaRepository();
    const schema = buildFullyPopulatedSchema();

    await repository.save(schema);

    await expect(repository.load(schema.id)).resolves.toEqual(schema);
  });

  it("loads null for an unknown id", async () => {
    const repository = createLocalStorageSchemaRepository();

    await expect(repository.load("missing-id")).resolves.toBeNull();
  });

  it("loads null for a corrupt JSON entry", async () => {
    const repository = createLocalStorageSchemaRepository();
    localStorage.setItem("ownsqldesigner:schema:broken", "{not json");

    await expect(repository.load("broken")).resolves.toBeNull();
  });

  it("loads null for an unknown storage version", async () => {
    const repository = createLocalStorageSchemaRepository();
    const schema = createSchema("Future Schema");
    localStorage.setItem(
      `ownsqldesigner:schema:${schema.id}`,
      JSON.stringify({ version: 2, schema }),
    );

    await expect(repository.load(schema.id)).resolves.toBeNull();
  });

  it("loads null for an entry that fails shape validation", async () => {
    const repository = createLocalStorageSchemaRepository();
    localStorage.setItem(
      "ownsqldesigner:schema:invalid",
      JSON.stringify({ version: 1, schema: { id: "not-a-uuid" } }),
    );

    await expect(repository.load("invalid")).resolves.toBeNull();
  });

  it("lists saved schemas as summaries sorted by name", async () => {
    const repository = createLocalStorageSchemaRepository();
    const orders = createSchema("Orders");
    const accounts = createSchema("Accounts");
    await repository.save(orders);
    await repository.save(accounts);

    const summaries = await repository.list();

    expect(summaries).toEqual([
      { id: accounts.id, name: "Accounts", updatedAt: accounts.updatedAt },
      { id: orders.id, name: "Orders", updatedAt: orders.updatedAt },
    ]);
  });

  it("skips corrupt entries and unrelated keys when listing", async () => {
    const repository = createLocalStorageSchemaRepository();
    const schema = createSchema("Blog Schema");
    await repository.save(schema);
    localStorage.setItem("ownsqldesigner:schema:broken", "{not json");
    localStorage.setItem("unrelated-key", "value");

    const summaries = await repository.list();

    expect(summaries).toEqual([
      { id: schema.id, name: "Blog Schema", updatedAt: schema.updatedAt },
    ]);
  });

  it("removes a saved schema from load and list", async () => {
    const repository = createLocalStorageSchemaRepository();
    const schema = createSchema("Blog Schema");
    await repository.save(schema);

    await repository.remove(schema.id);

    await expect(repository.load(schema.id)).resolves.toBeNull();
    await expect(repository.list()).resolves.toEqual([]);
  });

  it("leaves other schemas and the last schema id untouched when removing", async () => {
    const repository = createLocalStorageSchemaRepository();
    const blog = createSchema("Blog Schema");
    const shop = createSchema("Shop Schema");
    await repository.save(blog);
    await repository.save(shop);
    await repository.saveLastSchemaId(blog.id);

    await repository.remove(blog.id);

    await expect(repository.load(shop.id)).resolves.toEqual(shop);
    await expect(repository.loadLastSchemaId()).resolves.toBe(blog.id);
  });

  it("removing an unknown id is a no-op", async () => {
    const repository = createLocalStorageSchemaRepository();
    const schema = createSchema("Blog Schema");
    await repository.save(schema);

    await repository.remove("missing-id");

    await expect(repository.list()).resolves.toEqual([
      { id: schema.id, name: "Blog Schema", updatedAt: schema.updatedAt },
    ]);
  });

  it("normalizes an invalid size for the schema's dialect on load (0036)", async () => {
    const repository = createLocalStorageSchemaRepository();
    let schema = createSchema("PG Schema", { id: SCHEMA_ID, now: NOW, dialect: "postgresql" });
    schema = createTable(schema, "users", { id: USERS_TABLE_ID, now: NOW });
    schema = addColumn(
      schema,
      USERS_TABLE_ID,
      { name: "active", type: "BOOLEAN", ...COLUMN_DEFAULTS, size: "5" },
      { id: USERS_ID_COLUMN_ID, now: NOW },
    );
    await repository.save(schema);

    const loaded = await repository.load(schema.id);

    expect(loaded?.tables[0]?.columns[0]).toMatchObject({ type: "BOOLEAN", size: "" });
  });

  it("round-trips the last schema id", async () => {
    const repository = createLocalStorageSchemaRepository();

    await expect(repository.loadLastSchemaId()).resolves.toBeNull();

    await repository.saveLastSchemaId("some-id");

    await expect(repository.loadLastSchemaId()).resolves.toBe("some-id");
  });
});
