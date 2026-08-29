import { z } from "zod";
import type { SqlDialect } from "../dialect/sqlDialect";
import { EMPTY_COLUMN_KEY_MEMBERSHIP, type ColumnKeyMembershipDisabled } from "./key";

const columnKeyMembershipSchema = z.object({
  PRIMARY_KEY: z.boolean(),
  UNIQUE: z.boolean(),
  INDEX: z.boolean(),
});

export const defaultColumnTemplateSchema = z.object({
  // A stable id for the template row itself (used as a React key and for
  // reordering in the Settings editor) — unrelated to any real column's id,
  // which is generated fresh each time the template is applied.
  id: z.uuid(),
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.string().default(""),
  precision: z.string().default(""),
  defaultValue: z.string().default(""),
  nullable: z.boolean().default(true),
  autoIncrement: z.boolean().default(false),
  comment: z.string().default(""),
  keyMembership: columnKeyMembershipSchema.default(EMPTY_COLUMN_KEY_MEMBERSHIP),
});

export type DefaultColumnTemplate = z.infer<typeof defaultColumnTemplateSchema>;

// A dialect not present as a key simply has no configured template yet —
// this stays valid (no migration needed) if SQL_DIALECTS grows later.
export const defaultColumnTemplatesSettingsSchema = z.record(
  z.string(),
  z.array(defaultColumnTemplateSchema),
);

export type DefaultColumnTemplatesSettings = Partial<Record<SqlDialect, DefaultColumnTemplate[]>>;

export const EMPTY_DEFAULT_COLUMN_TEMPLATES_SETTINGS: DefaultColumnTemplatesSettings = {};

export function getDefaultColumnTemplatesForDialect(
  settings: DefaultColumnTemplatesSettings,
  dialect: SqlDialect,
): DefaultColumnTemplate[] {
  return settings[dialect] ?? [];
}

/**
 * Mirrors `getColumnKeyMembershipDisabled` for a template list instead of a
 * real `Table`: a table has at most one PRIMARY KEY, so a template row other
 * than `excludeTemplateId` already claiming it disables the option here too.
 * UNIQUE/INDEX have no template-level conflict (no composite keys, no real
 * foreign keys to reference a template row).
 */
export function getDefaultColumnTemplateKeyMembershipDisabled(
  templates: readonly DefaultColumnTemplate[],
  excludeTemplateId: string | null,
): ColumnKeyMembershipDisabled {
  const hasConflictingPrimaryKey = templates.some(
    (template) => template.id !== excludeTemplateId && template.keyMembership.PRIMARY_KEY,
  );
  return {
    PRIMARY_KEY: hasConflictingPrimaryKey ? "CONFLICTING_PRIMARY_KEY" : null,
    UNIQUE: null,
    INDEX: null,
  };
}
