import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { createPlatformServices } from "@/server/composition/platform-services";
import type { Actor } from "@/modules/identity/domain/session";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const actor: Actor = { userId: "platform", emailVerified: true, platformRole: "PLATFORM_OWNER" };
const query = { q: "", page: 1 };
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  const site = await fixture.db.site.create({
    data: {
      companyId: "x",
      name: "Private website",
      origin: "https://private.test",
      publicKey: "secret-widget-key",
    },
  });
  await fixture.db.feedback.create({
    data: {
      id: "private-report",
      siteId: site.id,
      message: "private visitor content",
      email: "visitor-secret@test.com",
      pageUrl: "https://private.test/sensitive",
      type: "ISSUE",
      submissionId: "private-submission",
      fingerprint: "private-fingerprint",
      attachment: {
        create: {
          key: "private-file-key.webp",
          filename: "private-name.webp",
          mime: "image/webp",
          size: 123,
        },
      },
      notes: { create: { authorId: "alice", body: "private internal note" } },
    },
  });
  await fixture.db.companyUsage.update({ where: { companyId: "x" }, data: { storedBytes: 123n } });
});
afterAll(async () => {
  await fixture?.close();
});

it("platform metadata returns real counts and never visitor content, keys, notes or URLs", async () => {
  const service = createPlatformServices(fixture.db, { current: async () => actor });
  const overview = await service.overview();
  expect(overview).toMatchObject({
    companies: 2,
    activeCompanies: 2,
    suspendedCompanies: 0,
    users: 6,
    websites: 1,
    reports: 1,
    storedBytes: "123",
  });
  const companies = await service.companies(query);
  expect(companies.total).toBe(2);
  const x = companies.items.find((company) => company.id === "x")!;
  expect(x).toMatchObject({ name: "x", websites: 1, reports: 1, members: 4, storedBytes: "123" });
  const detail = await service.company("x");
  const users = await service.users(query);
  expect(users.items.find((user) => user.id === "alice")?.companies).toEqual([
    { id: "x", name: "x", role: "OWNER" },
  ]);
  const audit = await service.audit(query);
  const serialized = JSON.stringify({ overview, companies, detail, users, audit });
  for (const secret of [
    "private visitor content",
    "visitor-secret@test.com",
    "private internal note",
    "private-file-key",
    "private-fingerprint",
    "secret-widget-key",
    "https://private.test",
  ]) {
    expect(serialized).not.toContain(secret);
  }
  expect(await service.companies({ q: "missing", page: 1 })).toMatchObject({ total: 0, items: [] });
});
it("Company Owner and stale/demoted Platform Owner cannot read platform data", async () => {
  const service = createPlatformServices(fixture.db, {
    current: async () => ({ ...actor, userId: "alice", platformRole: "USER" }),
  });
  await expect(service.overview()).rejects.toMatchObject({ code: "PLATFORM_FORBIDDEN" });
  await expect(
    createPlatformServices(fixture.db, { current: async () => null }).companies(query),
  ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await fixture.db.user.update({ where: { id: "platform" }, data: { platformRole: "USER" } });
  await expect(
    createPlatformServices(fixture.db, { current: async () => actor }).overview(),
  ).rejects.toMatchObject({ code: "PLATFORM_FORBIDDEN" });
  await fixture.db.user.update({
    where: { id: "platform" },
    data: { platformRole: "PLATFORM_OWNER" },
  });
});
it("suspension and reactivation require reason and atomically produce audit", async () => {
  const service = createPlatformServices(fixture.db, { current: async () => actor });
  const before = await service.company("x");
  await expect(
    service.setStatus("x", {
      status: "SUSPENDED",
      reason: "",
      expectedUpdatedAt: before.updatedAt,
    }),
  ).rejects.toMatchObject({ code: "PLATFORM_INPUT_INVALID" });
  const suspended = await service.setStatus("x", {
    status: "SUSPENDED",
    reason: "Beta abuse investigation",
    expectedUpdatedAt: before.updatedAt,
  });
  expect(suspended.status).toBe("SUSPENDED");
  expect(await fixture.db.feedback.count()).toBe(1);
  await expect(
    service.setStatus("x", {
      status: "ACTIVE",
      reason: "stale request",
      expectedUpdatedAt: before.updatedAt,
    }),
  ).rejects.toMatchObject({ code: "PLATFORM_CONFLICT" });
  await service.setStatus("x", {
    status: "ACTIVE",
    reason: "Investigation resolved",
    expectedUpdatedAt: suspended.updatedAt,
  });
  const events = await fixture.db.auditEvent.findMany({
    where: { companyId: "x" },
    orderBy: { createdAt: "asc" },
  });
  expect(events.map((event) => event.action)).toEqual(["COMPANY_SUSPENDED", "COMPANY_REACTIVATED"]);
  expect(events[0].actorId).toBe("platform");
});
it("Company limits can decrease below usage without deleting data and stale changes fail", async () => {
  const service = createPlatformServices(fixture.db, { current: async () => actor });
  const before = await service.company("x");
  const limits = { websites: 0, seats: 1, monthlyReports: 0, storageBytes: "1" };
  await expect(
    service.setLimits("x", {
      ...limits,
      websites: -1,
      reason: "invalid",
      expectedUpdatedAt: before.updatedAt,
    }),
  ).rejects.toMatchObject({ code: "PLATFORM_INPUT_INVALID" });
  const result = await service.setLimits("x", {
    ...limits,
    reason: "Manual beta allowance",
    expectedUpdatedAt: before.updatedAt,
  });
  expect(result.limits).toEqual(limits);
  expect(result.storedBytes).toBe("123");
  expect(await fixture.db.feedback.count()).toBe(1);
  await expect(
    service.setLimits("x", {
      ...limits,
      reason: "stale change",
      expectedUpdatedAt: before.updatedAt,
    }),
  ).rejects.toMatchObject({ code: "PLATFORM_CONFLICT" });
  expect(
    await fixture.db.auditEvent.count({
      where: { action: "COMPANY_LIMITS_CHANGED", companyId: "x" },
    }),
  ).toBe(1);
});
