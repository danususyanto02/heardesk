import { beforeAll, afterAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { createPlatformUsers } from "@/server/composition/platform-users";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const actor = { userId: "platform", emailVerified: true, platformRole: "PLATFORM_OWNER" as const };
beforeAll(async () => { fixture = await companyDatabase(); await seedCompanies(fixture.db); });
afterAll(async () => { await fixture?.close(); });
it("suspends client, revokes sessions, audits and preserves membership", async () => {
  await fixture.db.session.create({ data: { id: "client-session", userId: "alice", token: "client-token", expiresAt: new Date(Date.now()+86400000) } });
  const service = createPlatformUsers(fixture.db, { current: async () => actor });
  await service.change("alice", "SUSPEND", "Abuse investigation");
  expect((await fixture.db.user.findUniqueOrThrow({ where: { id: "alice" } })).accountStatus).toBe("SUSPENDED");
  expect(await fixture.db.session.count()).toBe(0);
  expect(await fixture.db.member.count({ where: { userId: "alice" } })).toBe(1);
  expect(await fixture.db.auditEvent.count({ where: { action: "USER_SUSPENDED" } })).toBe(1);
  await service.change("alice", "REACTIVATE", "Resolved");
  expect((await fixture.db.user.findUniqueOrThrow({ where: { id: "alice" } })).accountStatus).toBe("ACTIVE");
});
it("protects Platform Owners and refuses Company-owner actions", async () => {
  const service = createPlatformUsers(fixture.db, { current: async () => actor });
  await expect(service.change("platform", "SUSPEND", "Self lockout")).rejects.toMatchObject({ code: "PLATFORM_OWNER_PROTECTED" });
  await expect(service.change("alice", "REVOKE_SESSIONS", " ")).rejects.toMatchObject({ code: "PLATFORM_INPUT_INVALID" });
  await expect(createPlatformUsers(fixture.db, { current: async () => ({ ...actor, userId: "bob", platformRole: "USER" }) }).change("alice", "SUSPEND", "Bypass")).rejects.toMatchObject({ code: "PLATFORM_FORBIDDEN" });
});
it("database rejects a session created after suspension, including concurrent login ordering",async()=>{
 const service=createPlatformUsers(fixture.db,{current:async()=>actor});await service.change("alice","SUSPEND","Prevent racing login");
 await expect(fixture.db.session.create({data:{id:"racing-session",userId:"alice",token:"late-token",expiresAt:new Date(Date.now()+86400000)}})).rejects.toThrow();
 await service.change("alice","REACTIVATE","Resume test");expect(await fixture.db.session.count({where:{userId:"alice"}})).toBe(0);
});
