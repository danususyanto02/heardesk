import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { seedDemoData } from "../../scripts/demo-data";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
});
afterAll(async () => {
  await fixture?.close();
});
it("creates labeled Company demo with real usage and no login credentials, preserving existing data", async () => {
  const result = await seedDemoData(fixture.db, "platform", new Date("2026-10-06T12:00:00Z"));
  expect(result).toMatchObject({
    companies: 4,
    websites: 8,
    users: 12,
    reports: 48,
    notes: 12,
    auditEvents: 8,
  });
  expect(await fixture.db.organization.count()).toBe(6);
  expect(await fixture.db.account.count()).toBe(0);
  const companies = await fixture.db.organization.findMany({
    where: { id: { startsWith: "heardesk-demo-" } },
  });
  expect(companies.every((company) => company.name.endsWith("(Demo)"))).toBe(true);
  expect(
    await fixture.db.member.count({
      where: {
        userId: "platform",
        organizationId: { startsWith: "heardesk-demo-" },
        role: "OWNER",
      },
    }),
  ).toBe(4);
  expect(await fixture.db.companyProfile.count({ where: { status: "SUSPENDED" } })).toBe(1);
  const reports = await fixture.db.feedback.findMany({
    where: { site: { companyId: { startsWith: "heardesk-demo-" } } },
  });
  expect(reports.every((report) => report.message.startsWith("[Demo]"))).toBe(true);
  expect(new Set(reports.map((report) => report.status)).size).toBe(4);
  const periods = await fixture.db.reportUsagePeriod.findMany();
  expect(periods.reduce((sum, period) => sum + period.count, 0)).toBe(48);
  expect(await fixture.db.attachment.count()).toBe(0);
  expect(
    (await fixture.db.companyUsage.findMany()).every((usage) => usage.storedBytes === 0n),
  ).toBe(true);
});
it("rerun preserves edits, counts, account ownership and does not duplicate notes/audit", async () => {
  const existing = await fixture.db.feedback.findFirstOrThrow({
    where: { site: { companyId: { startsWith: "heardesk-demo-" } } },
  });
  await fixture.db.feedback.update({
    where: { id: existing.id },
    data: { status: "ARCHIVED", message: "[Demo] edited by user" },
  });
  await seedDemoData(fixture.db, "platform", new Date("2026-11-06T12:00:00Z"));
  expect(await fixture.db.feedback.count()).toBe(48);
  expect(await fixture.db.internalNote.count()).toBe(12);
  expect(await fixture.db.auditEvent.count()).toBe(8);
  expect(
    (await fixture.db.feedback.findUniqueOrThrow({ where: { id: existing.id } })).message,
  ).toBe("[Demo] edited by user");
  expect((await fixture.db.organization.findUniqueOrThrow({ where: { id: "x" } })).name).toBe("x");
  expect((await fixture.db.reportUsagePeriod.aggregate({ _sum: { count: true } }))._sum.count).toBe(
    48,
  );
});
it("requires real platform owner rather than granting a client platform privileges", async () => {
  await expect(seedDemoData(fixture.db, "alice", new Date())).rejects.toThrow(/platform owner/i);
  expect((await fixture.db.user.findUniqueOrThrow({ where: { id: "alice" } })).platformRole).toBe(
    "USER",
  );
});
