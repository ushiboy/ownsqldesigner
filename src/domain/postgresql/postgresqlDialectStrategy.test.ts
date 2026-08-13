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

  it("disallows a default value alongside auto-increment", () => {
    expect(postgresqlDialectStrategy.allowsDefaultWithAutoIncrement).toBe(false);
  });

  it("delegates isAutoIncrementEligible to the PostgreSQL rule", () => {
    expect(postgresqlDialectStrategy.isAutoIncrementEligible(TABLE.columns[0], "col-1")).toBe(true);
    expect(postgresqlDialectStrategy.isAutoIncrementEligible(TABLE.columns[0], "other-col")).toBe(
      false,
    );
  });

  it("delegates normalizeAutoIncrement to the PostgreSQL rule", () => {
    const normalized = postgresqlDialectStrategy.normalizeAutoIncrement({
      ...TABLE,
      columns: [{ ...TABLE.columns[0], type: "TEXT" }],
    });
    expect(normalized.columns[0].autoIncrement).toBe(false);
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
