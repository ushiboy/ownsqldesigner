import { createSchema, renameSchema, schemaSchema } from "./schema";

describe("createSchema", () => {
  it("creates a blank schema with the given name", () => {
    const schema = createSchema("Blog Schema");

    expect(schema.name).toBe("Blog Schema");
    expect(schema.tables).toEqual([]);
  });

  it("generates a unique id per schema", () => {
    const first = createSchema("First");
    const second = createSchema("Second");

    expect(first.id).not.toBe(second.id);
  });

  it("uses the injected id and time when provided", () => {
    const schema = createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    });

    expect(schema.id).toBe("c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01");
    expect(schema.createdAt).toEqual(new Date("2026-07-18T09:00:00.000Z"));
  });

  it("sets createdAt and updatedAt to the same instant", () => {
    const schema = createSchema("Blog Schema");

    expect(schema.updatedAt).toBe(schema.createdAt);
  });

  it("produces a document that passes runtime validation", () => {
    const schema = createSchema("Blog Schema");

    expect(schemaSchema.safeParse(schema).success).toBe(true);
  });
});

describe("renameSchema", () => {
  const original = createSchema("Blog Schema", {
    id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
    now: new Date("2026-07-18T09:00:00.000Z"),
  });

  it("updates the name and bumps updatedAt to the injected time", () => {
    const renamed = renameSchema(original, "Shop Schema", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed.name).toBe("Shop Schema");
    expect(renamed.updatedAt).toEqual(new Date("2026-07-19T09:00:00.000Z"));
  });

  it("preserves id, createdAt, and tables", () => {
    const renamed = renameSchema(original, "Shop Schema", {
      now: new Date("2026-07-19T09:00:00.000Z"),
    });

    expect(renamed.id).toBe(original.id);
    expect(renamed.createdAt).toEqual(original.createdAt);
    expect(renamed.tables).toEqual(original.tables);
  });

  it("does not mutate the input schema", () => {
    renameSchema(original, "Shop Schema", { now: new Date("2026-07-19T09:00:00.000Z") });

    expect(original.name).toBe("Blog Schema");
    expect(original.updatedAt).toEqual(new Date("2026-07-18T09:00:00.000Z"));
  });
});
