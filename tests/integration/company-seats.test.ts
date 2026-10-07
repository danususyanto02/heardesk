import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { reserveInvitationSeat, acceptReservedSeat, revokeReservedSeat } from "@/modules/usage/infrastructure/prisma-seat-usage";
import { createSeatServices } from "@/server/composition/seat-services";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const owner = { userId: "alice", emailVerified: true, platformRole: "USER" as const };
const now = new Date("2026-10-06T00:00:00Z");
const clock = { now: () => now };
beforeAll(async () => { fixture = await companyDatabase(); await seedCompanies(fixture.db); });
afterAll(async () => { await fixture?.close(); });
it("reserves final seat atomically and same-email retry does not consume another slot", async () => {
  await fixture.db.companyLimits.update({ where: { companyId: "x" }, data: { seatLimit: 5 } });
  const results = await Promise.allSettled(["first@example.test", "second@example.test"].map(email => reserveInvitationSeat(fixture.db, owner, "x", email, "AGENT", clock)));
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  const invitation = await fixture.db.invitation.findFirstOrThrow();
  expect((await reserveInvitationSeat(fixture.db, owner, "x", invitation.email.toUpperCase(), "AGENT", clock)).id).toBe(invitation.id);
  expect(await fixture.db.invitation.count({ where: { status: "pending" } })).toBe(1);
  await revokeReservedSeat(fixture.db, owner, "x", invitation.id, now);
  expect((await reserveInvitationSeat(fixture.db, owner, "x", "next@example.test", "VIEWER", clock)).role).toBe("VIEWER");
});
it("expired invitations release slots and only matching verified email can accept", async () => {
  await fixture.db.invitation.updateMany({ data: { expiresAt: new Date("2026-10-05") } });
  const invite = await reserveInvitationSeat(fixture.db, owner, "x", "new@example.test", "AGENT", clock);
  await fixture.db.user.create({ data: { id: "new", name: "New", email: "new@example.test", emailVerified: false } });
  const actor = { ...owner, userId: "new" };
  await expect(acceptReservedSeat(fixture.db, actor, "x", invite.id, clock)).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  await fixture.db.user.update({ where: { id: "new" }, data: { emailVerified: true } });
  await expect(acceptReservedSeat(fixture.db, { ...owner, userId: "bob" }, "x", invite.id, clock)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
  const member = await acceptReservedSeat(fixture.db, actor, "x", invite.id, clock);
  expect(member.role).toBe("AGENT");
  expect((await fixture.db.invitation.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe("accepted");
  expect(await fixture.db.member.count({ where: { organizationId: "x" } })).toBe(5);
  await expect(acceptReservedSeat(fixture.db, actor, "x", invite.id, clock)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
});
it("direct seat allocation rejects Agent and Owner invitations", async () => {
  await expect(reserveInvitationSeat(fixture.db, { ...owner, userId: "agent" }, "x", "blocked@example.test", "VIEWER", clock)).rejects.toMatchObject({ code: "COMPANY_FORBIDDEN" });
  await expect(reserveInvitationSeat(fixture.db, owner, "x", "blocked@example.test", "OWNER" as "AGENT", clock)).rejects.toMatchObject({ code: "INVITATION_ROLE_INVALID" });
});
it("application facade normalizes recipient and enforces invitation role boundary", async () => {
  await fixture.db.companyLimits.update({ where: { companyId: "y" }, data: { seatLimit: 10 } });
  const services = createSeatServices(fixture.db, clock), actor = { ...owner, userId: "bob" };
  const invite = await services.reserve(actor, "y", " Facade@Example.Test ", "VIEWER");
  expect(invite.email).toBe("facade@example.test");
  await expect(services.reserve(actor, "y", "new@example.test", "OWNER" as "VIEWER")).rejects.toMatchObject({ code: "INVITATION_ROLE_INVALID" });
  await services.revoke(actor, "y", invite.id);
  expect((await fixture.db.invitation.findUniqueOrThrow({ where: { id: invite.id } })).status).toBe("canceled");
});
it("invitation expiry is sampled after waiting for Company lock", async () => {
  await fixture.db.user.create({ data: { id: "late", name: "Late", email: "late@example.test", emailVerified: true } });
  await fixture.db.invitation.create({ data: { id: "wait-expiry", organizationId: "y", email: "late@example.test", role: "VIEWER", inviterId: "bob", expiresAt: new Date("2026-10-06T00:00:01Z") } });
  let acquired!: () => void, release!: () => void;
  const ready = new Promise<void>(resolve => acquired = resolve), wait = new Promise<void>(resolve => release = resolve);
  const holder = fixture.db.$transaction(async tx => { await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = 'y' FOR UPDATE`; acquired(); await wait; });
  await ready;
  let current = now;
  const accepting = acceptReservedSeat(fixture.db, { ...owner, userId: "late" }, "y", "wait-expiry", { now: () => current });
  const outcome = expect(accepting).rejects.toMatchObject({ code: "INVITATION_INVALID" });
  current = new Date("2026-10-06T00:00:02Z"); release(); await holder; await outcome;
});
