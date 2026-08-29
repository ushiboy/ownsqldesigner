import { getDialectStrategy } from "../dialect";
import { addColumn } from "./column";
import type { DefaultColumnTemplate } from "./defaultColumnTemplate";
import { addKey } from "./key";
import { createTable } from "./table";
import { KEY_TYPES, type Schema } from "./types";

type CreateTableWithDefaultColumnsOptions = {
  id?: string;
  now?: Date;
};

/**
 * Creates a table the same way `createTable` does, then applies each
 * template's column (and any single-column keys it owns) to it as part of
 * the same `Schema` update — so callers can commit table creation plus its
 * dialect's default columns as one undo/redo step. An empty `templates`
 * list produces exactly `createTable`'s result.
 */
export function createTableWithDefaultColumns(
  schema: Schema,
  name: string,
  templates: readonly DefaultColumnTemplate[],
  options: CreateTableWithDefaultColumnsOptions = {},
): Schema {
  const { now = new Date() } = options;
  const afterCreate = createTable(schema, name, { id: options.id, now });
  if (afterCreate === schema) {
    return schema;
  }
  const newTable = afterCreate.tables.at(-1)!;
  const withTemplates = templates.reduce(
    (current, template) => applyDefaultColumnTemplate(current, newTable.id, template, now),
    afterCreate,
  );
  // A template whose key couldn't be created (e.g. a second PRIMARY_KEY row)
  // was added with normalize:false and never got the addKey-triggered
  // normalization pass that would otherwise clear its now-invalid
  // autoIncrement — this final pass catches that case.
  const strategy = getDialectStrategy(schema.dialect);
  return {
    ...withTemplates,
    tables: withTemplates.tables.map((table) =>
      table.id === newTable.id ? strategy.normalizeColumnForDialect(table) : table,
    ),
  };
}

function applyDefaultColumnTemplate(
  schema: Schema,
  tableId: string,
  template: DefaultColumnTemplate,
  now: Date,
): Schema {
  const { id: _templateId, keyMembership, ...columnFields } = template;
  const columnId = crypto.randomUUID();
  const hasAnyKey = KEY_TYPES.some((type) => keyMembership[type]);
  // Mirrors ColumnDialog's addColumn-then-key-assignment submit: a row that's
  // about to own a key gets normalized once addKey below runs (normalizing
  // first would clear autoIncrement before the key exists to justify it); a
  // keyless row has no follow-up step, so it's safe — and necessary — to
  // normalize now.
  const withColumn = addColumn(schema, tableId, columnFields, {
    id: columnId,
    now,
    normalize: !hasAnyKey,
  });
  if (withColumn === schema) {
    return schema;
  }
  return KEY_TYPES.reduce(
    (current, type) =>
      keyMembership[type]
        ? addKey(current, tableId, { type, columnIds: [columnId] }, { now })
        : current,
    withColumn,
  );
}
