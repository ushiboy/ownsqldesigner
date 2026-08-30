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

// Applies as one `Schema` update, so table creation plus its default
// columns lands as a single undo/redo step (0054).
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
  // See AddColumnOptions.normalize (0036).
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
