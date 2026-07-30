import {
  POSTS_TABLE_ID,
  USERS_EMAIL_COLUMN_ID,
  USERS_TABLE_ID,
  buildTwoTableSchema,
  getTable,
} from "./test-fixtures";
import {
  isColumnNameAvailable,
  isNameTaken,
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

describe("isNameTaken", () => {
  it("is true for an exact match", () => {
    expect(isNameTaken("users", ["posts", "users"])).toBe(true);
  });

  it("is true for a case-insensitive match", () => {
    expect(isNameTaken("Users", ["posts", "users"])).toBe(true);
  });

  it("is false when no existing name matches", () => {
    expect(isNameTaken("comments", ["posts", "users"])).toBe(false);
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

  it("is true for a table's own current name when excluded", () => {
    expect(isTableNameAvailable(schema, "posts", POSTS_TABLE_ID)).toBe(true);
  });
});

describe("isColumnNameAvailable", () => {
  const schema = buildTwoTableSchema();
  const users = getTable(schema, USERS_TABLE_ID);

  it("is true for a valid, unused name", () => {
    expect(isColumnNameAvailable(users, "created_at")).toBe(true);
  });

  it("is false for a name already used by another column, case-insensitively", () => {
    expect(isColumnNameAvailable(users, "Email")).toBe(false);
  });

  it("is false for an invalid identifier shape", () => {
    expect(isColumnNameAvailable(users, "1created_at")).toBe(false);
  });

  it("is true for a column's own current name when excluded", () => {
    expect(isColumnNameAvailable(users, "email", USERS_EMAIL_COLUMN_ID)).toBe(true);
  });
});
