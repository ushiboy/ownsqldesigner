import type { Table } from "../schema";
import { sqliteDialectStrategy } from "./sqliteDialectStrategy";

const TABLE: Table = {
  id: "table-1",
  name: "users",
  comment: "",
  position: { x: 0, y: 0 },
  columns: [
    {
      id: "col-1",
      name: "id",
      type: "INTEGER",
      size: "",
      precision: "",
      defaultValue: "",
      nullable: false,
      autoIncrement: true,
      comment: "",
    },
  ],
  keys: [{ id: "key-1", type: "PRIMARY_KEY", columnIds: ["col-1"] }],
  foreignKeys: [],
};

describe("sqliteDialectStrategy", () => {
  it("exposes the SQLite column types", () => {
    expect(sqliteDialectStrategy.columnTypes).toEqual([
      "INTEGER",
      "TEXT",
      "REAL",
      "BLOB",
      "NUMERIC",
    ]);
  });

  it("treats every SQLite column type except BLOB as sizable", () => {
    expect(sqliteDialectStrategy.sizableColumnTypes).toEqual([
      "INTEGER",
      "TEXT",
      "REAL",
      "NUMERIC",
    ]);
  });

  it("treats no SQLite column type as precision-eligible", () => {
    expect(sqliteDialectStrategy.precisionColumnTypes).toEqual([]);
  });

  it("only allows INTEGER for auto-increment", () => {
    expect(sqliteDialectStrategy.autoIncrementEligibleColumnTypes).toEqual(["INTEGER"]);
  });

  it("allows a default value alongside auto-increment", () => {
    expect(sqliteDialectStrategy.allowsDefaultWithAutoIncrement).toBe(true);
  });

  it("delegates isAutoIncrementEligible to the SQLite rule", () => {
    expect(sqliteDialectStrategy.isAutoIncrementEligible(TABLE.columns[0], "col-1")).toBe(true);
    expect(sqliteDialectStrategy.isAutoIncrementEligible(TABLE.columns[0], "other-col")).toBe(
      false,
    );
  });

  it("delegates normalizeColumnForDialect to the SQLite rule", () => {
    const normalized = sqliteDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "TEXT" }],
    });
    expect(normalized.columns[0].autoIncrement).toBe(false);
  });

  it("keeps size for a sizable SQLite column type", () => {
    const normalized = sqliteDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "TEXT", size: "10" }],
    });
    expect(normalized.columns[0].size).toBe("10");
  });

  it("clears size for BLOB, since a blob has no length modifier", () => {
    const normalized = sqliteDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "BLOB", size: "10" }],
    });
    expect(normalized.columns[0].size).toBe("");
  });

  it("keeps a malformed-looking size unchanged, since SQLite opts out of format validation", () => {
    const normalized = sqliteDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "TEXT", size: "abc" }],
    });
    expect(normalized.columns[0].size).toBe("abc");
  });

  it("keeps a default value alongside auto-increment", () => {
    const normalized = sqliteDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], defaultValue: "0" }],
    });
    expect(normalized.columns[0].defaultValue).toBe("0");
  });

  it("keeps a default value that wouldn't format-validate under PostgreSQL, since SQLite opts out", () => {
    const normalized = sqliteDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "TEXT", defaultValue: "not-a-boolean" }],
    });
    expect(normalized.columns[0].defaultValue).toBe("not-a-boolean");
  });

  it("always treats size as valid", () => {
    expect(sqliteDialectStrategy.isSizeValid("TEXT", "abc")).toBe(true);
  });

  it("always treats precision as valid", () => {
    expect(sqliteDialectStrategy.isPrecisionValid("TEXT", "abc")).toBe(true);
  });

  it("always treats a default value as valid", () => {
    expect(sqliteDialectStrategy.isDefaultValueValid("TEXT", "abc")).toBe(true);
  });

  it("delegates isNameTaken to the SQLite rule", () => {
    expect(sqliteDialectStrategy.isNameTaken("Users", ["users"])).toBe(true);
  });

  it("delegates hasDuplicateNames to the SQLite rule", () => {
    expect(sqliteDialectStrategy.hasDuplicateNames(["users", "Users"])).toBe(true);
  });

  it("delegates isReservedKeyword to the SQLite rule", () => {
    expect(sqliteDialectStrategy.isReservedKeyword("order")).toBe(true);
    expect(sqliteDialectStrategy.isReservedKeyword("users")).toBe(false);
  });

  it("delegates generateDdl to the SQLite DDL generator", () => {
    expect(sqliteDialectStrategy.generateDdl([])).toBe("");
  });
});
