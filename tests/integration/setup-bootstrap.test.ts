import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { companyDatabase } from "../support/company-database";
import { bootstrap } from "@/server/setup";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
vi.mock("@/server/db", () => ({
  get db() {
    return fixture.db;
  },
}));
beforeAll(async () => {
  fixture = await companyDatabase();
  vi.stubEnv("UREPORT_SETUP_TOKEN", "x".repeat(32));
});
afterAll(async () => {
  await fixture?.close();
  vi.unstubAllEnvs();
});
const input = {
  email: "owner@example.test",
  password: "Bootstrap-test-password-2026!",
  token: "x".repeat(32),
};
it("rejects invalid activation without creating accounts", async () => {
  await expect(bootstrap({ ...input, token: "y".repeat(32) })).rejects.toMatchObject({
    status: 403,
  });
  expect(await fixture.db.user.count()).toBe(0);
});
it("serializes bootstrap so only one verified platform owner is created", async () => {
  const results = await Promise.allSettled([bootstrap(input), bootstrap(input)]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await fixture.db.user.count()).toBe(1);
  expect(await fixture.db.account.count()).toBe(1);
  expect(await fixture.db.auditEvent.count({ where: { action: "PLATFORM_BOOTSTRAPPED" } })).toBe(1);
  const owner = await fixture.db.user.findFirstOrThrow();
  expect(owner).toMatchObject({ emailVerified: true, platformRole: "PLATFORM_OWNER" });
  const account = await fixture.db.account.findFirstOrThrow();
  expect(account.password).not.toBe(input.password);
  await expect(bootstrap(input)).rejects.toMatchObject({ status: 409 });
});
