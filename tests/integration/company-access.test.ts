import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { createCompanyAccess } from "@/modules/companies/infrastructure/prisma-company-access";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
beforeAll(async () => { fixture = await companyDatabase(); await seedCompanies(fixture.db); });
afterAll(async () => { await fixture?.close(); });
const alice = { userId: "alice", emailVerified: true, platformRole: "USER" as const };

it("checks live membership and Company permission against real database", async () => {
  const access = createCompanyAccess(fixture.db);
  await expect(access.read(alice, "x", "feedback:read", async scope => scope.companyId)).resolves.toBe("x");
  await expect(access.read(alice, "y", "feedback:read", async () => "leak")).rejects.toMatchObject({ code: "COMPANY_NOT_FOUND" });
  await expect(access.read({ ...alice, userId: "viewer" }, "x", "feedback:status", async () => "mutate")).rejects.toMatchObject({ code: "COMPANY_FORBIDDEN" });
  await expect(access.read({ ...alice, userId: "platform", platformRole: "PLATFORM_OWNER" }, "x", "feedback:read", async () => "leak")).rejects.toMatchObject({ code: "COMPANY_NOT_FOUND" });
});
it("rejects next request after membership removal or Company suspension", async () => {
  const access = createCompanyAccess(fixture.db);
  await fixture.db.member.delete({ where: { id: "agent-member" } });
  await expect(access.read({ ...alice, userId: "agent" }, "x", "feedback:read", async () => "leak")).rejects.toMatchObject({ code: "COMPANY_NOT_FOUND" });
  await fixture.db.companyProfile.update({ where: { organizationId: "x" }, data: { status: "SUSPENDED" } });
  await expect(access.read(alice, "x", "feedback:read", async () => "leak")).rejects.toMatchObject({ code: "COMPANY_SUSPENDED" });
  await fixture.db.companyProfile.update({ where: { organizationId: "x" }, data: { status: "ACTIVE" } });
});
it("serializes mutation and suspension by shared Company lock", async () => {
  const access = createCompanyAccess(fixture.db);
  let started!: () => void, release!: () => void;
  const barrier = new Promise<void>(resolve => started = resolve);
  const held = new Promise<void>(resolve => release = resolve);
  const write = access.write(alice, "x", "company:settings", async (_scope, tx) => {
    started(); await held; await tx.organization.update({ where: { id: "x" }, data: { name: "Committed before suspension" } });
  });
  await barrier;
  const suspend = fixture.db.$transaction(async tx => { await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = 'x' FOR UPDATE`; await tx.companyProfile.update({ where: { organizationId: "x" }, data: { status: "SUSPENDED" } }); });
  release(); await Promise.all([write, suspend]);
  expect((await fixture.db.organization.findUniqueOrThrow({ where: { id: "x" } })).name).toBe("Committed before suspension");
  await expect(access.write(alice, "x", "feedback:status", async () => "mutate")).rejects.toMatchObject({ code: "COMPANY_SUSPENDED" });
});
it("membership removal under Company lock wins over later scoped write", async () => {
  await fixture.db.companyProfile.update({ where: { organizationId: "x" }, data: { status: "ACTIVE" } });
  const access = createCompanyAccess(fixture.db);
  let locked!: () => void, release!: () => void;
  const ready = new Promise<void>(resolve => locked = resolve), hold = new Promise<void>(resolve => release = resolve);
  const remove = fixture.db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = 'x' FOR UPDATE`;
    locked(); await hold;
    await tx.member.delete({ where: { id: "admin-member" } });
  });
  await ready;
  const later = access.write({ ...alice, userId: "admin" }, "x", "sites:manage", async () => "unexpected mutation");
  const outcome = expect(later).rejects.toMatchObject({ code: "COMPANY_NOT_FOUND" });
  release(); await remove; await outcome;
});
