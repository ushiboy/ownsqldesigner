import { sqliteDialectStrategy } from "../sqlite/sqliteDialectStrategy";
import { getDialectStrategy } from "./dialectRegistry";

describe("getDialectStrategy", () => {
  it("resolves the SQLite strategy for the sqlite dialect", () => {
    expect(getDialectStrategy("sqlite")).toBe(sqliteDialectStrategy);
  });
});
