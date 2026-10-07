import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
import { integrationEnvironment } from "./integration-config";

const values = integrationEnvironment(parse(readFileSync(".env.test")));
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.ts", ...process.argv.slice(2)], {
  env: { ...process.env, ...values }, stdio: "inherit",
});
process.exit(result.status ?? 1);
