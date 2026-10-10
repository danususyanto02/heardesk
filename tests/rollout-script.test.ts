import { afterEach, beforeEach, expect, it, vi } from "vitest";
import path from "node:path";
import { createHash } from "node:crypto";
const sandbox = vi.hoisted(() => ({
  files: new Map<string, string | Buffer>(),
  writes: new Map<string, string>(),
  query: vi.fn(),
  dump: vi.fn(),
  logs: vi.fn(),
  grants: vi.fn(),
  end: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  readFile: async (file: string) => {
    if (String(file).endsWith("database.dump")) {
      return Buffer.from("archive");
    }
    const value = sandbox.files.get(String(file));
    if (value === undefined) {
      throw new Error("Unexpected sandbox read: " + file);
    }
    return value;
  },
  writeFile: async (file: string, value: string) => {
    sandbox.writes.set(String(file), value);
  },
  mkdir: async () => {},
  cp: async () => {},
  readdir: async () => [],
  stat: async () => ({ size: 0 }),
}));
vi.mock("node:child_process", () => ({ spawnSync: sandbox.dump }));
vi.mock("pg", () => ({
  default: {
    Pool: class {
      query = sandbox.query;
      end = sandbox.end;
      async connect() {
        return { query: sandbox.query, release: () => {} };
      }
    },
  },
}));
vi.mock("../scripts/runtime-grants", () => ({ provisionRuntimeGrants: sandbox.grants }));
beforeEach(() => {
  sandbox.files.clear();
  sandbox.writes.clear();
  sandbox.query.mockReset();
  sandbox.dump.mockReset();
  sandbox.grants.mockReset();
  sandbox.files.set(
    ".env",
    'DATABASE_URL="postgresql://runtime@localhost/ureport"\nAPP_URL="https://feedback.test"\n',
  );
  sandbox.files.set(
    ".env.migration",
    'MIGRATION_DATABASE_URL="postgresql://operator:synthetic-secret@localhost/ureport"\n',
  );
  sandbox.query.mockResolvedValue({ rows: [] });
  sandbox.dump.mockReturnValue({ status: 0, stderr: "" });
  vi.spyOn(console, "log").mockImplementation(sandbox.logs);
  vi.stubEnv("HEARDESK_MIGRATION_APPROVED", "false");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
async function run(action: string) {
  const original = process.argv;
  process.argv = ["node", "rollout-company.ts", action, "sandbox-backup"];
  vi.resetModules();
  try {
    await import("../scripts/rollout-company");
  } finally {
    process.argv = original;
  }
}
it("rejects mismatched application/migration database targets before executing actions", async () => {
  sandbox.files.set(
    ".env.migration",
    'MIGRATION_DATABASE_URL="postgresql://operator@otherhost/ureport"',
  );
  await expect(run("inspect")).rejects.toThrow("Expected matching application database targets");
  expect(sandbox.query).not.toHaveBeenCalled();
});
it("reports inspect counts and hashes for all legacy tables without writes", async () => {
  sandbox.query.mockImplementation(async (sql: string) => {
    if (sql.includes("current_database")) {
      return { rows: [{ database: "ureport", role: "operator", version: "16" }] };
    }
    if (sql.includes("_prisma_migrations")) {
      return { rows: [{ migration_name: "initial" }] };
    }
    return { rows: [{ value: '{"id":1}' }] };
  });
  await run("inspect");
  const result = JSON.parse(sandbox.logs.mock.calls.at(-1)![0]);
  expect(result.database).toBe("ureport");
  expect(Object.keys(result.snapshot)).toHaveLength(8);
  expect(result.snapshot.Feedback).toMatchObject({
    count: 1,
    hash: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
  expect(sandbox.writes.size).toBe(0);
});
it("enables local email settings once while preserving database configuration", async () => {
  await run("local-email");
  const text = sandbox.writes.get(".env")!;
  expect(text).toContain('HEARDESK_EMAIL_MODE="local"');
  expect(text).toContain('DATABASE_URL="postgresql://runtime@localhost/ureport"');
  sandbox.files.set(".env", text);
  await run("local-email");
  expect(sandbox.writes.get(".env")!.match(/HEARDESK_EMAIL_MODE=/g)).toHaveLength(1);
});
it.each(["provision", "configure"])("requires explicit approval for %s", async (action) => {
  await expect(run(action)).rejects.toThrow("Approved rollout required");
  expect(sandbox.grants).not.toHaveBeenCalled();
});
it("provisions runtime grants transactionally and rolls back failures", async () => {
  vi.stubEnv("HEARDESK_MIGRATION_APPROVED", "true");
  await run("provision");
  expect(sandbox.query).toHaveBeenCalledWith("COMMIT");
  sandbox.query.mockClear();
  sandbox.grants.mockRejectedValue(new Error("Grant denied"));
  await expect(run("provision")).rejects.toThrow("Grant denied");
  expect(sandbox.query).toHaveBeenCalledWith("ROLLBACK");
});
it("refuses configuring without exactly one legacy owner", async () => {
  vi.stubEnv("HEARDESK_MIGRATION_APPROVED", "true");
  await expect(run("configure")).rejects.toThrow("Expected exactly one initial owner Company");
  expect(sandbox.query).toHaveBeenCalledWith("ROLLBACK");
  expect(sandbox.writes.size).toBe(0);
});
it("requires backup tools and redacts database passwords in dump failures", async () => {
  vi.stubEnv("POSTGRES_BIN", "");
  await expect(run("backup")).rejects.toThrow("POSTGRES_BIN required");
  vi.stubEnv("POSTGRES_BIN", "sandbox-tools");
  sandbox.dump.mockReturnValue({ status: 1, stderr: "connection failed for synthetic-secret" });
  await expect(run("backup")).rejects.toThrow("connection failed for [redacted]");
});
it("rejects unreadable backup archives before copying storage", async () => {
  vi.stubEnv("POSTGRES_BIN", "sandbox-tools");
  sandbox.dump
    .mockReturnValueOnce({ status: 0, stderr: "" })
    .mockReturnValueOnce({ status: 1, stderr: "invalid" });
  await expect(run("backup")).rejects.toThrow("Backup archive cannot be read");
  expect(sandbox.writes.size).toBe(0);
});
it("refuses ownership-invalid smoke and unknown actions", async () => {
  await expect(run("smoke")).rejects.toThrow("Initial ownership invalid");
  await expect(run("unknown")).rejects.toThrow("Use inspect, backup, configure, or verify");
});

it("configures approved allowances, audit reason, and runtime verification together", async () => {
  vi.stubEnv("HEARDESK_MIGRATION_APPROVED", "true");
  sandbox.query.mockImplementation(async (sql: string) => ({
    rows:
      sql.includes("organizationId") && sql.startsWith("SELECT")
        ? [{ organizationId: "company-x" }]
        : [],
  }));
  await run("configure");
  expect(sandbox.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE "CompanyLimits"'))).toBe(
    true,
  );
  expect(sandbox.query.mock.calls.some(([sql]) => sql.startsWith('INSERT INTO "AuditEvent"'))).toBe(
    true,
  );
  expect(sandbox.writes.get(".env")).toContain('HEARDESK_DEFAULT_STORAGE_BYTES="1073741824"');
  expect(sandbox.grants).toHaveBeenCalled();
});

it("backs up empty storage with readable archive and matching legacy snapshots", async () => {
  vi.stubEnv("POSTGRES_BIN", "sandbox-tools");
  await run("backup");
  const manifestEntry = [...sandbox.writes.entries()].find(([file]) =>
    file.endsWith("manifest.json"),
  )!;
  const manifest = JSON.parse(manifestEntry[1]);
  expect(manifest.storage).toEqual({});
  expect(manifest.database).toBe("ureport");
  expect(manifest.dumpHash).toBe(createHash("sha256").update("archive").digest("hex"));
});

it("verifies restore snapshots and rejects changed counts", async () => {
  const hash = createHash("sha256").update("").digest("hex");
  const before = Object.fromEntries(
    [
      "user",
      "account",
      "Installation",
      "Site",
      "Feedback",
      "Attachment",
      "InternalNote",
      "StorageBudget",
    ].map((table) => [table, { count: 0, hash }]),
  );
  sandbox.files.set(
    path.join("sandbox-backup", "manifest.json"),
    JSON.stringify({ before, storage: {} }),
  );
  await run("restore-check");
  expect(sandbox.logs.mock.calls.at(-1)![0]).toContain("all 8 legacy table hashes/counts match");
  sandbox.files.set(
    path.join("sandbox-backup", "manifest.json"),
    JSON.stringify({ before: { ...before, Feedback: { count: 1, hash } }, storage: {} }),
  );
  await expect(run("restore-check")).rejects.toThrow("Restored database hashes differ");
});

it("verifies legacy data, storage and Company ownership after rollout", async () => {
  const hash = createHash("sha256").update("").digest("hex");
  const before = Object.fromEntries(
    [
      "user",
      "account",
      "Installation",
      "Site",
      "Feedback",
      "Attachment",
      "InternalNote",
      "StorageBudget",
    ].map((table) => [table, { count: 0, hash }]),
  );
  sandbox.files.set(
    path.join("sandbox-backup", "manifest.json"),
    JSON.stringify({ before, storage: {} }),
  );
  sandbox.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes("count(*)") ? [{ count: "1" }] : [],
  }));
  await run("verify");
  expect(JSON.parse(sandbox.logs.mock.calls.at(-1)![0])).toMatchObject({
    preservedLegacyTables: 6,
    storageFiles: 0,
    companyCount: 1,
  });
});
