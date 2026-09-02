import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDialectStrategy } from "../src/domain/dialect";
import { buildPostgresqlVerificationSchema } from "./fixtures/postgresqlFixture";
import { buildSqliteVerificationSchema } from "./fixtures/sqliteFixture";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const OUTPUT_DIR = path.join(moduleDir, ".output");
export const SQLITE_SQL_PATH = path.join(OUTPUT_DIR, "sqlite.sql");
export const POSTGRESQL_SQL_PATH = path.join(OUTPUT_DIR, "postgresql.sql");

/** Builds both dialects' verification fixtures and writes their generated DDL to `.output/`. */
export function generateVerificationSql(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const sqliteSchema = buildSqliteVerificationSchema();
  const sqliteDdl = getDialectStrategy("sqlite").generateDdl(sqliteSchema.tables);
  writeFileSync(SQLITE_SQL_PATH, `${sqliteDdl}\n`);

  const postgresqlSchema = buildPostgresqlVerificationSchema();
  const postgresqlDdl = getDialectStrategy("postgresql").generateDdl(postgresqlSchema.tables);
  writeFileSync(POSTGRESQL_SQL_PATH, `${postgresqlDdl}\n`);
}
