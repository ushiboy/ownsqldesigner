import { z } from "zod";
import { getDialectStrategy } from "../domain/dialect";
import { type Schema, type SchemaSummary, schemaSchema } from "../domain/schema";
import type { SchemaRepository } from "../domain/schemaRepository";

const SCHEMA_KEY_PREFIX = "ownsqldesigner:schema:";
const LAST_SCHEMA_ID_KEY = "ownsqldesigner:last-schema-id";
const STORAGE_VERSION = 1;

const envelopeSchema = z.object({
  version: z.literal(STORAGE_VERSION),
  schema: schemaSchema,
});

export function createLocalStorageSchemaRepository(
  storage: Storage = window.localStorage,
): SchemaRepository {
  return {
    async list() {
      const summaries: SchemaSummary[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key === null || !key.startsWith(SCHEMA_KEY_PREFIX)) {
          continue;
        }
        const schema = parseStoredSchema(storage.getItem(key));
        if (schema === null) {
          continue;
        }
        summaries.push({ id: schema.id, name: schema.name, updatedAt: schema.updatedAt });
      }
      return summaries.toSorted((a, b) => a.name.localeCompare(b.name));
    },
    async load(id) {
      return parseStoredSchema(storage.getItem(SCHEMA_KEY_PREFIX + id));
    },
    async save(schema) {
      storage.setItem(
        SCHEMA_KEY_PREFIX + schema.id,
        JSON.stringify({ version: STORAGE_VERSION, schema }),
      );
    },
    async remove(id) {
      storage.removeItem(SCHEMA_KEY_PREFIX + id);
    },
    async loadLastSchemaId() {
      return storage.getItem(LAST_SCHEMA_ID_KEY);
    },
    async saveLastSchemaId(id) {
      storage.setItem(LAST_SCHEMA_ID_KEY, id);
    },
  };
}

// Corrupt or unknown-version entries load as null; the raw data is left in
// place for manual recovery (see docs/design/0002).
function parseStoredSchema(raw: string | null): Schema | null {
  if (raw === null) {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = envelopeSchema.safeParse(json);
  if (!result.success) {
    return null;
  }
  const { schema } = result.data;
  const strategy = getDialectStrategy(schema.dialect);
  return {
    ...schema,
    tables: schema.tables.map((table) => strategy.normalizeColumnForDialect(table)),
  };
}
