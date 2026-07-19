import type { Schema } from "../domain/schema";
import type { SchemaRepository } from "../domain/schemaRepository";

type FakeSchemaRepositorySeed = {
  schemas?: Schema[];
  lastSchemaId?: string;
};

/** In-memory SchemaRepository double for tests and stories. */
export function createFakeSchemaRepository(seed: FakeSchemaRepositorySeed = {}): SchemaRepository {
  const documents = new Map<string, Schema>(seed.schemas?.map((schema) => [schema.id, schema]));
  let lastSchemaId = seed.lastSchemaId ?? null;

  return {
    async list() {
      return [...documents.values()]
        .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
        .toSorted((a, b) => a.name.localeCompare(b.name));
    },
    async load(id) {
      return documents.get(id) ?? null;
    },
    async save(schema) {
      documents.set(schema.id, schema);
    },
    async loadLastSchemaId() {
      return lastSchemaId;
    },
    async saveLastSchemaId(id) {
      lastSchemaId = id;
    },
  };
}
