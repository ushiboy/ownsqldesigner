import { z } from "zod";

export const DEFAULT_SCHEMA_NAME = "New Schema";

export const schemaSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  // Always persisted as []; widened when the table model is designed (REQ-009).
  tables: z.array(z.never()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Schema = z.infer<typeof schemaSchema>;

export type SchemaSummary = Pick<Schema, "id" | "name" | "updatedAt">;

type CreateSchemaOptions = {
  id?: string;
  now?: Date;
};

export function createSchema(name: string, options: CreateSchemaOptions = {}): Schema {
  const { id = crypto.randomUUID(), now = new Date() } = options;
  return {
    id,
    name,
    tables: [],
    createdAt: now,
    updatedAt: now,
  };
}

type RenameSchemaOptions = {
  now?: Date;
};

// Unlike selection, a rename is a content edit, so updatedAt is bumped.
export function renameSchema(
  schema: Schema,
  name: string,
  options: RenameSchemaOptions = {},
): Schema {
  const { now = new Date() } = options;
  return {
    ...schema,
    name,
    updatedAt: now,
  };
}
