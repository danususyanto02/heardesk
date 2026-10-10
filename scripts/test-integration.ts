import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
import { integrationEnvironment, integrationEnvFile } from "./integration-config";

let values: Record<string, string>;
try {
  values = integrationEnvironment(parse(readFileSync(integrationEnvFile(process.env))));
} catch {
  console.error(
    "Cannot load isolated integration test configuration. Check the test environment file and both ureport_test connections.",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.integration.config.ts",
    ...process.argv.slice(2),
  ],
  {
    env: { ...process.env, ...values },
    stdio: "inherit",
  },
);
process.exit(result.status ?? 1);
