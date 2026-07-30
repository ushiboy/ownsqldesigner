import { addColumn } from "./column";
import { addKey } from "./key";
import { createSchema, createTable } from "./table";
import type { Schema, Table } from "./types";

export const columnFields = {
  name: "title",
  type: "TEXT" as const,
  size: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

export const USERS_TABLE_ID = "11111111-1111-4111-8111-111111111111";
export const USERS_ID_COLUMN_ID = "22222222-2222-4222-8222-222222222222";
export const USERS_ID_KEY_ID = "33333333-3333-4333-8333-333333333333";
export const USERS_EMAIL_COLUMN_ID = "44444444-4444-4444-8444-444444444444";
export const POSTS_TABLE_ID = "55555555-5555-4555-8555-555555555555";
export const POSTS_USER_ID_COLUMN_ID = "66666666-6666-4666-8666-666666666666";
export const POSTS_FOREIGN_KEY_ID = "77777777-7777-4777-8777-777777777777";
export const POSTS_NEW_COLUMN_ID = "88888888-8888-4888-8888-888888888888";
export const POSTS_NEW_FOREIGN_KEY_ID = "99999999-9999-4999-8999-999999999999";
export const POSTS_USER_ID_KEY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const COMMENTS_TABLE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const COMMENTS_POST_USER_ID_COLUMN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const CYCLE_X_TABLE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const CYCLE_COL_A_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const CYCLE_COL_A_KEY_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const CYCLE_Y_TABLE_ID = "12121212-1212-4121-8121-121212121212";
export const CYCLE_COL_B_ID = "23232323-2323-4232-8232-232323232323";
export const CYCLE_COL_B_KEY_ID = "34343434-3434-4343-8343-343434343434";

export function getTable(schema: Schema, tableId: string): Table {
  const table = schema.tables.find((t) => t.id === tableId);
  if (table === undefined) {
    throw new Error(`expected a table with id ${tableId}`);
  }
  return table;
}

/** Replaces the matching table with a shallow-merged copy, for building deliberately-broken fixtures. */
export function withTable(schema: Schema, tableId: string, overrides: Partial<Table>): Schema {
  return {
    ...schema,
    tables: schema.tables.map((table) =>
      table.id === tableId ? Object.assign({}, table, overrides) : table,
    ),
  };
}

export function buildTwoTableSchema(): Schema {
  const withUsersTable = createTable(
    createSchema("Blog Schema", {
      id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
      now: new Date("2026-07-18T09:00:00.000Z"),
    }),
    "users",
    { id: USERS_TABLE_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withUsersIdColumn = addColumn(
    withUsersTable,
    USERS_TABLE_ID,
    { ...columnFields, name: "id", type: "INTEGER" },
    { id: USERS_ID_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withUsersEmailColumn = addColumn(
    withUsersIdColumn,
    USERS_TABLE_ID,
    { ...columnFields, name: "email" },
    { id: USERS_EMAIL_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withUsersPrimaryKey = addKey(
    withUsersEmailColumn,
    USERS_TABLE_ID,
    { type: "PRIMARY_KEY", columnIds: [USERS_ID_COLUMN_ID] },
    { id: USERS_ID_KEY_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
  const withPostsTable = createTable(withUsersPrimaryKey, "posts", {
    id: POSTS_TABLE_ID,
    now: new Date("2026-07-18T09:00:00.000Z"),
  });
  return addColumn(
    withPostsTable,
    POSTS_TABLE_ID,
    { ...columnFields, name: "user_id" },
    { id: POSTS_USER_ID_COLUMN_ID, now: new Date("2026-07-18T09:00:00.000Z") },
  );
}
