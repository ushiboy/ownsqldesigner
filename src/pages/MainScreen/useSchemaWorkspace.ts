import { useEffect, useState } from "react";
import {
  DEFAULT_SCHEMA_NAME,
  type Schema,
  type SchemaSummary,
  createSchema,
} from "../../domain/schema";
import type { SchemaRepository } from "../../domain/schemaRepository";

type SchemaWorkspace = {
  /** null only during the initial async restore tick. */
  currentSchema: Schema | null;
  savedSchemas: SchemaSummary[];
  createSchema: (name: string) => void;
};

export function useSchemaWorkspace(repository: SchemaRepository): SchemaWorkspace {
  const [currentSchema, setCurrentSchema] = useState<Schema | null>(null);
  const [savedSchemas, setSavedSchemas] = useState<SchemaSummary[]>([]);

  // Startup restore: the last-edited schema, or a fresh blank one on the
  // first visit (or when the last-edited pointer dangles).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lastSchemaId = await repository.loadLastSchemaId();
      const restored = lastSchemaId === null ? null : await repository.load(lastSchemaId);
      if (!cancelled) {
        setCurrentSchema(restored ?? createSchema(DEFAULT_SCHEMA_NAME));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // The single auto-save path: every mutation flows through currentSchema.
  useEffect(() => {
    if (currentSchema === null) {
      return;
    }
    let cancelled = false;
    (async () => {
      await repository.save(currentSchema);
      await repository.saveLastSchemaId(currentSchema.id);
      const summaries = await repository.list();
      if (!cancelled) {
        setSavedSchemas(summaries);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repository, currentSchema]);

  return {
    currentSchema,
    savedSchemas,
    createSchema: (name) => {
      setCurrentSchema(createSchema(name));
    },
  };
}
