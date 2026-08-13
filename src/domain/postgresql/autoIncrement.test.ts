import type { Column } from "../schema";
import { isPostgresqlAutoIncrementEligible } from "./autoIncrement";

const BASE_COLUMN: Column = {
  id: "col-1",
  name: "id",
  type: "INTEGER",
  size: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: false,
  comment: "",
};

function column(fields: Partial<Column>): Column {
  return { ...BASE_COLUMN, ...fields };
}

describe("isPostgresqlAutoIncrementEligible", () => {
  it("is eligible for an INTEGER column that is the sole primary key column", () => {
    expect(isPostgresqlAutoIncrementEligible(column({ type: "INTEGER" }), "col-1")).toBe(true);
  });

  it("is not eligible for a non-INTEGER column", () => {
    expect(isPostgresqlAutoIncrementEligible(column({ type: "TEXT" }), "col-1")).toBe(false);
  });

  it("is not eligible when the column is not the primary key column", () => {
    expect(isPostgresqlAutoIncrementEligible(column({ type: "INTEGER" }), "col-2")).toBe(false);
  });

  it("is not eligible when there is no primary key column", () => {
    expect(isPostgresqlAutoIncrementEligible(column({ type: "INTEGER" }), undefined)).toBe(false);
  });
});
