import { beforeAll, afterAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { reserveUploadCapacity } from "@/modules/usage/infrastructure/prisma-upload-capacity";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  await fixture.db.storageBudget.create({ data: { id: 1 } });
});
afterAll(async () => {
  await fixture?.close();
});
const capacity = { free: 1000n, floor: 100n, quota: 1000n };
it("last Company byte slot is reserved once under concurrent upload allocation", async () => {
  await fixture.db.companyLimits.update({
    where: { companyId: "x" },
    data: { storageBytesLimit: 100n },
  });
  const results = await Promise.allSettled(
    ["one", "two"].map((id) =>
      reserveUploadCapacity(fixture.db, "x", id, 100n, async () => capacity),
    ),
  );
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await fixture.db.uploadReservation.count({ where: { companyId: "x" } })).toBe(1);
  await fixture.db.uploadReservation.deleteMany();
});
it("global physical floor includes reservations held by other Companies", async () => {
  await fixture.db.companyLimits.update({
    where: { companyId: "x" },
    data: { storageBytesLimit: 10000n },
  });
  await fixture.db.uploadReservation.create({
    data: { id: "other-company", companyId: "y", bytes: 150n },
  });
  await expect(
    reserveUploadCapacity(fixture.db, "x", "blocked", 100n, async () => ({
      free: 300n,
      floor: 100n,
      quota: 10000n,
    })),
  ).rejects.toMatchObject({ code: "UPLOAD_CAPACITY_UNAVAILABLE" });
  expect(await fixture.db.uploadReservation.count({ where: { companyId: "x" } })).toBe(0);
  await fixture.db.uploadReservation.deleteMany();
});
it("global logical capacity and suspended Company both reject allocation", async () => {
  await fixture.db.storageBudget.update({ where: { id: 1 }, data: { used: 950n } });
  await expect(
    reserveUploadCapacity(fixture.db, "x", "logical", 100n, async () => capacity),
  ).rejects.toMatchObject({ code: "UPLOAD_CAPACITY_UNAVAILABLE" });
  await fixture.db.companyProfile.update({
    where: { organizationId: "x" },
    data: { status: "SUSPENDED" },
  });
  await expect(
    reserveUploadCapacity(fixture.db, "x", "suspended", 1n, async () => capacity),
  ).rejects.toMatchObject({ code: "COMPANY_SUSPENDED" });
});
