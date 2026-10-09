import { config } from "dotenv";
import { spawnSync, spawn } from "node:child_process";
import pg from "pg";
import { validateTestDatabaseUrls } from "./test-config";
import path from "node:path";
config({ path: ".env.test", override: true, quiet: true });
validateTestDatabaseUrls(process.env.DATABASE_URL, process.env.MIGRATION_DATABASE_URL);
const migration = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env: process.env, stdio: "inherit" },
);
if (migration.status !== 0) {
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(
  'DELETE FROM "AuditEvent"; DELETE FROM "ReportReservation"; DELETE FROM "UploadReservation"; DELETE FROM "InternalNote"; DELETE FROM "Attachment"; DELETE FROM "Feedback"; DELETE FROM "Installation"; DELETE FROM "Site"; DELETE FROM "CompanyCreationRequest"; DELETE FROM "ReportUsagePeriod"; DELETE FROM "CompanyUsage"; DELETE FROM "CompanyLimits"; DELETE FROM "CompanyProfile"; DELETE FROM "invitation"; DELETE FROM "member"; DELETE FROM "organization"; DELETE FROM "session"; DELETE FROM "account"; DELETE FROM "verification"; DELETE FROM "user"; DELETE FROM "RateBucket"; DELETE FROM "rateLimit"; DELETE FROM "StorageBudget";',
);
await pool.end();
const production = process.env.E2E_PRODUCTION === "true";
const child = spawn(
  process.execPath,
  production
    ? ["--import", "tsx", "scripts/start.ts"]
    : ["node_modules/next/dist/bin/next", "dev", "-p", "3100"],
  {
    env: {
      ...process.env,
      PORT: "3100",
      HOSTNAME: "localhost",
      HEARDESK_EMAIL_MODE: "local",
      HEARDESK_EMAIL_DIR: path.resolve("test-results/mailbox"),
      HEARDESK_LOCAL_SIGNUP: "true",
      HEARDESK_DEFAULT_WEBSITES: "10",
      HEARDESK_DEFAULT_SEATS: "10",
      HEARDESK_DEFAULT_MONTHLY_REPORTS: "1000",
      HEARDESK_DEFAULT_STORAGE_BYTES: "104857600",
    },
    stdio: "inherit",
  },
);
process.on("SIGTERM", () => child.kill());
process.on("SIGINT", () => child.kill());
child.on("exit", (code) => process.exit(code ?? 0));
