import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { createCompanyOnboarding } from "@/server/composition/company-onboarding";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const actor = { userId: "alice", emailVerified: true, platformRole: "USER" as const };
const limits = { websiteLimit: 3, seatLimit: 5, monthlyReportLimit: 1000, storageBytesLimit: 1073741824n };
beforeAll(async () => { fixture = await companyDatabase(); await seedCompanies(fixture.db); });
afterAll(async () => { await fixture?.close(); });
it("Company creation atomically owns all records and deduplicates concurrent retry", async () => {
  const service = createCompanyOnboarding(fixture.db, limits);
  const input = { name: "  New Company  ", idempotencyKey: "fixed-creation-key" };
  const results = await Promise.all([service.create(actor, input), service.create(actor, input)]);
  expect(results[0]).toEqual(results[1]); expect(results[0].name).toBe("New Company");
  expect(await fixture.db.member.count({ where: { organizationId: results[0].id, userId: "alice", role: "OWNER" } })).toBe(1);
  expect((await fixture.db.companyLimits.findUniqueOrThrow({ where: { companyId: results[0].id } })).storageBytesLimit).toBe(limits.storageBytesLimit);
  expect(await fixture.db.companyProfile.count({ where: { organizationId: results[0].id } })).toBe(1);
  await expect(service.create(actor, { ...input, name: "Different" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
});
it("checks verified identity from database and lists only memberships", async () => {
  const service = createCompanyOnboarding(fixture.db, limits);
  await fixture.db.user.update({ where: { id: "bob" }, data: { emailVerified: false } });
  await expect(service.create({ ...actor, userId: "bob" }, { name: "Forbidden", idempotencyKey: "forbidden-key" })).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  const list = await service.list(actor);
  expect(list.some(company => company.id === "x")).toBe(true);
  expect(list.some(company => company.id === "y")).toBe(false);
  expect(await service.list({ ...actor, userId: "platform", platformRole: "PLATFORM_OWNER" })).toEqual([]);
});
