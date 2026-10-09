import { config } from "dotenv";
import { spawnSync } from "node:child_process";
config({ path: ".env.migration", quiet: true });
if (!process.env.MIGRATION_DATABASE_URL) {
  throw new Error("MIGRATION_DATABASE_URL is required.");
}
if (process.env.HEARDESK_MIGRATION_APPROVED !== "true") {
  throw new Error(
    "Company migration requires a database/storage backup and explicit operator approval. Set HEARDESK_MIGRATION_APPROVED=true only after review.",
  );
}
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: process.env.MIGRATION_DATABASE_URL } },
);
process.exit(result.status ?? 1);
