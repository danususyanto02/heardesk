import { defineConfig } from "vitest/config";
import path from "node:path";
import { validateTestDatabaseUrls } from "./scripts/test-config";

if (process.env.INTEGRATION_TESTS !== "true")
  throw new Error("Run integration tests through npm run test:integration.");
validateTestDatabaseUrls(process.env.DATABASE_URL, process.env.MIGRATION_DATABASE_URL);
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
