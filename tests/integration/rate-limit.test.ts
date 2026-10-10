import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { companyDatabase } from "../support/company-database";
import { clientKey, rateLimit } from "@/server/rate-limit";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
vi.mock("@/server/db", () => ({
  get db() {
    return fixture.db;
  },
}));
beforeAll(async () => {
  fixture = await companyDatabase();
});
afterAll(async () => {
  await fixture?.close();
  vi.unstubAllEnvs();
});
it("atomically enforces concurrent attempts and resets expired buckets", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 3 }, () => rateLimit("concurrent", 2)),
  );
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
  const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason).toMatchObject({ status: 429, code: "RATE_LIMITED" });
  await fixture.db.rateBucket.update({
    where: { key: "concurrent" },
    data: { expiresAt: new Date(0) },
  });
  await rateLimit("concurrent", 2, 30);
  expect(
    (await fixture.db.rateBucket.findUniqueOrThrow({ where: { key: "concurrent" } })).count,
  ).toBe(1);
});
it("ignores spoofed forwarded addresses unless proxy trust is explicitly enabled", () => {
  vi.stubEnv("TRUST_PROXY", "false");
  const first = new Request("http://localhost", { headers: { "x-forwarded-for": "192.0.2.1" } });
  const second = new Request("http://localhost", { headers: { "x-forwarded-for": "192.0.2.2" } });
  expect(clientKey(first)).toBe(clientKey(second));
  vi.stubEnv("TRUST_PROXY", "true");
  expect(clientKey(first)).not.toBe(clientKey(second));
  expect(clientKey(new Request("http://localhost"))).toMatch(/^[a-f0-9]{64}$/);
});
