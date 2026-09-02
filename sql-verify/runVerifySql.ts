import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateVerificationSql } from "./generateSql";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const COMPOSE_FILE = path.join(moduleDir, "docker-compose.yml");

const POSTGRESQL_CONNECTION_URL = "postgresql://sqlverify:sqlverify@postgres:5432/sqlverify";

type StepResult = {
  ok: boolean;
  output: string;
};

function runComposeInherit(args: string[]): boolean {
  const result = spawnSync("docker", ["compose", "-f", COMPOSE_FILE, ...args], {
    stdio: "inherit",
  });
  return result.status === 0;
}

function runComposeCapture(args: string[]): StepResult {
  const result = spawnSync("docker", ["compose", "-f", COMPOSE_FILE, ...args], {
    encoding: "utf8",
  });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function applyInContainer(command: string): StepResult {
  return runComposeCapture(["run", "--rm", "runner", "sh", "-c", command]);
}

function reportDialect(name: string, result: StepResult): boolean {
  console.log(`${name}: ${result.ok ? "PASS" : "FAIL"}`);
  if (!result.ok) {
    console.error(result.output);
  }
  return result.ok;
}

function main(): void {
  generateVerificationSql();

  console.log("Starting PostgreSQL container...");
  if (!runComposeInherit(["up", "-d", "--wait", "postgres"])) {
    console.error("Failed to start the postgres container. Is Docker running?");
    runComposeInherit(["down", "-v"]);
    process.exit(1);
  }

  try {
    console.log("Applying SQLite DDL...");
    const sqliteResult = applyInContainer("sqlite3 -bail /tmp/verify.db < /work/sqlite.sql");
    const sqliteOk = reportDialect("SQLite", sqliteResult);

    console.log("Applying PostgreSQL DDL...");
    const postgresqlResult = applyInContainer(
      `psql "${POSTGRESQL_CONNECTION_URL}" -v ON_ERROR_STOP=1 -f /work/postgresql.sql`,
    );
    const postgresqlOk = reportDialect("PostgreSQL", postgresqlResult);

    if (!sqliteOk || !postgresqlOk) {
      process.exitCode = 1;
    }
  } finally {
    console.log("Tearing down containers...");
    runComposeInherit(["down", "-v"]);
  }
}

main();
