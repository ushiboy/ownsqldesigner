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

  it("treats every SQLite column type as sizable", () => {
    expect(sqliteDialectStrategy.sizableColumnTypes).toEqual(sqliteDialectStrategy.columnTypes);
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

  it("delegates normalizeAutoIncrement to the SQLite rule", () => {
    const normalized = sqliteDialectStrategy.normalizeAutoIncrement({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "TEXT" }],
    });
    expect(normalized.columns[0].autoIncrement).toBe(false);
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
