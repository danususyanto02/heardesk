import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

it("exits before running tests and redacts malformed secret-file connection values", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "heardesk-runner-test-"));
  const secret = "synthetic-runner-password";
  try {
    const file = path.join(directory, "test.env");
    await writeFile(
      file,
      `DATABASE_URL=postgresql://ci-user:${secret}@::bad/ureport_test\nMIGRATION_DATABASE_URL=postgresql://operator@localhost/ureport_test\n`,
    );
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/test-integration.ts"], {
      env: { ...process.env, HEARDESK_TEST_ENV_FILE: file },
      encoding: "utf8",
      timeout: 10000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Cannot load isolated integration test configuration");
    expect(result.stderr + result.stdout).not.toContain(secret);
    expect(result.stdout).not.toContain("RUN");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
