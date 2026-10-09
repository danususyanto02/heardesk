import { config } from "dotenv";
import { defineConfig } from "prisma/config";
config({ path: ".env.migration", quiet: true });
config({ quiet: true });
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL },
});
