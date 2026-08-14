import type { Table } from "../schema";
import { postgresqlDialectStrategy } from "./postgresqlDialectStrategy";

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

describe("postgresqlDialectStrategy", () => {
  it("exposes the PostgreSQL column types", () => {
    expect(postgresqlDialectStrategy.columnTypes).toEqual([
      "SMALLINT",
      "INTEGER",
      "BIGINT",
      "NUMERIC",
      "REAL",
      "DOUBLE PRECISION",
      "BOOLEAN",
      "VARCHAR",
      "CHAR",
      "TEXT",
      "DATE",
      "TIME",
      "TIMESTAMP",
      "UUID",
      "JSONB",
    ]);
  });

  it("only treats VARCHAR/CHAR/NUMERIC as sizable", () => {
    expect(postgresqlDialectStrategy.sizableColumnTypes).toEqual(["VARCHAR", "CHAR", "NUMERIC"]);
  });

  it("allows SMALLINT, INTEGER, and BIGINT for auto-increment", () => {
    expect(postgresqlDialectStrategy.autoIncrementEligibleColumnTypes).toEqual([
      "SMALLINT",
      "INTEGER",
      "BIGINT",
    ]);
  });

  it("disallows a default value alongside auto-increment", () => {
    expect(postgresqlDialectStrategy.allowsDefaultWithAutoIncrement).toBe(false);
  });

  it("delegates isAutoIncrementEligible to the PostgreSQL rule", () => {
    expect(postgresqlDialectStrategy.isAutoIncrementEligible(TABLE.columns[0], "col-1")).toBe(true);
    expect(postgresqlDialectStrategy.isAutoIncrementEligible(TABLE.columns[0], "other-col")).toBe(
      false,
    );
  });

  it("delegates normalizeColumnForDialect to the PostgreSQL rule", () => {
    const normalized = postgresqlDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "TEXT" }],
    });
    expect(normalized.columns[0].autoIncrement).toBe(false);
  });

  it("clears size for a non-sizable column type", () => {
    const normalized = postgresqlDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "BOOLEAN", size: "5" }],
    });
    expect(normalized.columns[0].size).toBe("");
  });

  it("clears a default value alongside auto-increment", () => {
    const normalized = postgresqlDialectStrategy.normalizeColumnForDialect({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], defaultValue: "1" }],
    });
    expect(normalized.columns[0].defaultValue).toBe("");
  });

  it("delegates isNameTaken to the PostgreSQL rule", () => {
    expect(postgresqlDialectStrategy.isNameTaken("Users", ["users"])).toBe(true);
  });

  it("delegates hasDuplicateNames to the PostgreSQL rule", () => {
    expect(postgresqlDialectStrategy.hasDuplicateNames(["users", "Users"])).toBe(true);
  });

  it("delegates isReservedKeyword to the PostgreSQL rule", () => {
    expect(postgresqlDialectStrategy.isReservedKeyword("order")).toBe(true);
    expect(postgresqlDialectStrategy.isReservedKeyword("users")).toBe(false);
  });

  it("delegates generateDdl to the PostgreSQL DDL generator", () => {
    expect(postgresqlDialectStrategy.generateDdl([])).toBe("");
  });
});
