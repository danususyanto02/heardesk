import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { createPlatformServices } from "@/server/composition/platform-services";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  const future = new Date(Date.now() + 86400000);
  await fixture.db.invitation.createMany({
    data: [
      {
        id: "one",
        organizationId: "x",
        email: "invite@example.test",
        role: "VIEWER",
        inviterId: "alice",
        expiresAt: future,
      },
      {
        id: "two",
        organizationId: "x",
        email: "INVITE@example.test",
        role: "VIEWER",
        inviterId: "alice",
        expiresAt: future,
      },
      {
        id: "member",
        organizationId: "x",
        email: "alice@example.test",
        role: "VIEWER",
        inviterId: "alice",
        expiresAt: future,
      },
      {
        id: "expired",
        organizationId: "x",
        email: "expired@example.test",
        role: "VIEWER",
        inviterId: "alice",
        expiresAt: new Date(0),
      },
      {
        id: "canceled",
        organizationId: "x",
        email: "canceled@example.test",
        role: "VIEWER",
        status: "canceled",
        inviterId: "alice",
        expiresAt: future,
      },
    ],
  });
});
afterAll(async () => {
  await fixture?.close();
});
it("platform usage matches admission seats with distinct live nonmember invitations", async () => {
  const service = createPlatformServices(fixture.db, {
    current: async () => ({
      userId: "platform",
      emailVerified: true,
      platformRole: "PLATFORM_OWNER",
    }),
  });
  const company = await service.company("x");
  expect(company.members).toBe(4);
  expect(company.occupiedSeats).toBe(5);
  const list = await service.companies({ q: "", page: 1 });
  expect(list.items.find((row) => row.id === "x")?.occupiedSeats).toBe(5);
});
