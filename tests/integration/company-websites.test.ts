import { beforeAll, afterAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { createCompanyServices } from "@/server/composition/company-services";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const actor = { userId: "alice", emailVerified: true, platformRole: "USER" as const };
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  await fixture.db.companyLimits.update({ where: { companyId: "x" }, data: { websiteLimit: 1 } });
});
afterAll(async () => {
  await fixture?.close();
});
it("serialized website creation respects last Company slot", async () => {
  const services = createCompanyServices(fixture.db);
  const results = await Promise.allSettled(
    ["a", "b"].map((name) =>
      services.createWebsite(actor, "x", {
        name,
        origin: `https://${name}.test`,
        buttonLabel: "Feedback",
        position: "right",
      }),
    ),
  );
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await fixture.db.site.count({ where: { companyId: "x" } })).toBe(1);
});
it("Agent cannot allocate websites and scoped update cannot change Company", async () => {
  const services = createCompanyServices(fixture.db);
  await expect(
    services.createWebsite({ ...actor, userId: "agent" }, "x", {
      name: "blocked",
      origin: "https://blocked.test",
      buttonLabel: "Feedback",
      position: "left",
    }),
  ).rejects.toMatchObject({ code: "COMPANY_FORBIDDEN" });
  const site = await fixture.db.site.findFirstOrThrow();
  await services.updateWebsite(actor, "x", site.id, {
    name: "Updated",
    origin: site.origin,
    buttonLabel: "Report",
    position: "left",
  });
  expect((await fixture.db.site.findUniqueOrThrow({ where: { id: site.id } })).companyId).toBe("x");
});
