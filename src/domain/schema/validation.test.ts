import { sqliteDialectStrategy } from "../sqlite/sqliteDialectStrategy";
import {
  POSTS_TABLE_ID,
  USERS_EMAIL_COLUMN_ID,
  USERS_TABLE_ID,
  buildTwoTableSchema,
  getTable,
} from "./test-fixtures";
import {
  describeNameValidity,
  isColumnNameAvailable,
  isTableNameAvailable,
  isValidIdentifierName,
} from "./validation";

describe("isValidIdentifierName", () => {
  it("accepts a name starting with a letter or underscore, made only of letters/digits/underscores", () => {
    expect(isValidIdentifierName("users")).toBe(true);
    expect(isValidIdentifierName("_users")).toBe(true);
    expect(isValidIdentifierName("user_2")).toBe(true);
  });

  it("rejects a name starting with a digit", () => {
    expect(isValidIdentifierName("2users")).toBe(false);
  });

  it("rejects a name containing a space or symbol", () => {
    expect(isValidIdentifierName("user name")).toBe(false);
    expect(isValidIdentifierName("user-name")).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(isValidIdentifierName("")).toBe(false);
  });
});

describe("describeNameValidity", () => {
  it("flags an empty name as empty, not invalid-shape, reserved, or duplicate", () => {
    expect(describeNameValidity("", ["posts"], sqliteDialectStrategy)).toEqual({
      isEmpty: true,
      isInvalidShape: false,
      isReserved: false,
      isDuplicate: false,
      isInvalid: true,
    });
  });

  it("flags an invalid identifier shape", () => {
    expect(describeNameValidity("1posts", ["users"], sqliteDialectStrategy)).toEqual({
      isEmpty: false,
      isInvalidShape: true,
      isReserved: false,
      isDuplicate: false,
      isInvalid: true,
    });
  });

  it("flags a SQL reserved keyword, case-insensitively", () => {
    expect(describeNameValidity("Order", ["posts", "users"], sqliteDialectStrategy)).toEqual({
      isEmpty: false,
      isInvalidShape: false,
      isReserved: true,
      isDuplicate: false,
      isInvalid: true,
    });
  });

  it("flags a name already used by a sibling, case-insensitively", () => {
    expect(describeNameValidity("Posts", ["posts", "users"], sqliteDialectStrategy)).toEqual({
      isEmpty: false,
      isInvalidShape: false,
      isReserved: false,
      isDuplicate: true,
      isInvalid: true,
    });
  });

  it("is fully valid for a well-formed, unused name", () => {
    expect(describeNameValidity("comments", ["posts", "users"], sqliteDialectStrategy)).toEqual({
      isEmpty: false,
      isInvalidShape: false,
      isReserved: false,
      isDuplicate: false,
      isInvalid: false,
    });
  });
});

describe("isTableNameAvailable", () => {
  const schema = buildTwoTableSchema();

  it("is true for a valid, unused name", () => {
    expect(isTableNameAvailable(schema, "comments")).toBe(true);
  });

  it("is false for a name already used by another table, case-insensitively", () => {
    expect(isTableNameAvailable(schema, "Posts")).toBe(false);
  });

  it("is false for an invalid identifier shape", () => {
    expect(isTableNameAvailable(schema, "1comments")).toBe(false);
  });

  it("is false for a SQL reserved keyword", () => {
    expect(isTableNameAvailable(schema, "order")).toBe(false);
  });

  it("is true for a table's own current name when excluded", () => {
    expect(isTableNameAvailable(schema, "posts", POSTS_TABLE_ID)).toBe(true);
  });
});

describe("isColumnNameAvailable", () => {
  const schema = buildTwoTableSchema();
  const users = getTable(schema, USERS_TABLE_ID);

  it("is true for a valid, unused name", () => {
    expect(isColumnNameAvailable(users, "created_at", sqliteDialectStrategy)).toBe(true);
  });

  it("is false for a name already used by another column, case-insensitively", () => {
    expect(isColumnNameAvailable(users, "Email", sqliteDialectStrategy)).toBe(false);
  });

  it("is false for an invalid identifier shape", () => {
    expect(isColumnNameAvailable(users, "1created_at", sqliteDialectStrategy)).toBe(false);
  });

  it("is false for a SQL reserved keyword", () => {
    expect(isColumnNameAvailable(users, "select", sqliteDialectStrategy)).toBe(false);
  });

  it("is true for a column's own current name when excluded", () => {
    expect(
      isColumnNameAvailable(users, "email", sqliteDialectStrategy, USERS_EMAIL_COLUMN_ID),
    ).toBe(true);
  });
});
