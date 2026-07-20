import { createSchema } from "../domain/schema";
import { createLocalStorageSchemaRepository } from "./localStorageSchemaRepository";

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

  it("round-trips the last schema id", async () => {
    const repository = createLocalStorageSchemaRepository();

    await expect(repository.loadLastSchemaId()).resolves.toBeNull();

    await repository.saveLastSchemaId("some-id");

    await expect(repository.loadLastSchemaId()).resolves.toBe("some-id");
  });
});
