import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { reconcileCompanyStorage } from "@/modules/usage/infrastructure/prisma-storage-reconcile";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  await fixture.db.storageBudget.create({ data: { id: 1, used: 999n } });
});
afterAll(async () => {
  await fixture?.close();
});
it("rebuilds Company/global bytes while reclaiming only expired reservations", async () => {
  const now = new Date("2026-10-06T00:00:00Z");
  const deleted: string[] = [];
  const site = await fixture.db.site.create({
    data: { name: "X", companyId: "x", origin: "https://x.test", publicKey: "key" },
  });
  await fixture.db.feedback.create({
    data: {
      id: "r",
      siteId: site.id,
      type: "ISSUE",
      message: "report",
      submissionId: "r",
      fingerprint: "hash",
      attachment: {
        create: {
          id: "image",
          key: "attached.webp",
          filename: "image.webp",
          mime: "image/webp",
          size: 100,
        },
      },
    },
  });
  await fixture.db.uploadReservation.createMany({
    data: [
      { id: "stale", companyId: "x", bytes: 100n, createdAt: new Date("2026-10-04") },
      { id: "live", companyId: "x", bytes: 100n, createdAt: now },
    ],
  });
  await fixture.db.reportReservation.createMany({
    data: [
      {
        id: "expired",
        companyId: "x",
        siteId: site.id,
        submissionId: "expired",
        period: "2026-10",
        expiresAt: now,
      },
      {
        id: "fresh",
        companyId: "x",
        siteId: site.id,
        submissionId: "fresh",
        period: "2026-10",
        expiresAt: new Date("2026-10-07"),
      },
    ],
  });
  const result = await reconcileCompanyStorage(
    fixture.db,
    {
      discard: async (key) => {
        deleted.push(key);
      },
      list: async () => [
        { key: "orphan.webp", modifiedAt: new Date("2026-10-01") },
        { key: "live.webp", modifiedAt: new Date("2026-10-01") },
        { key: "attached.webp", modifiedAt: new Date("2026-10-01") },
      ],
    },
    now,
  );
  expect(result.removed).toBe(1);
  expect(deleted).toEqual(["stale.webp", "orphan.webp"]);
  expect(
    (await fixture.db.companyUsage.findUniqueOrThrow({ where: { companyId: "x" } })).storedBytes,
  ).toBe(100n);
  expect(
    (await fixture.db.companyUsage.findUniqueOrThrow({ where: { companyId: "y" } })).storedBytes,
  ).toBe(0n);
  expect((await fixture.db.storageBudget.findUniqueOrThrow({ where: { id: 1 } })).used).toBe(100n);
  expect((await fixture.db.reportReservation.findMany()).map((row) => row.id)).toEqual(["fresh"]);
});
it("disk cleanup failure retains reservation instead of freeing unresolved capacity", async () => {
  await fixture.db.uploadReservation.create({
    data: { id: "cannot-delete", companyId: "x", bytes: 100n, createdAt: new Date("2026-10-01") },
  });
  await expect(
    reconcileCompanyStorage(
      fixture.db,
      {
        discard: async () => {
          throw new Error("Disk permission denied");
        },
        list: async () => [],
      },
      new Date("2026-10-06"),
    ),
  ).rejects.toThrow("Disk permission denied");
  expect(
    await fixture.db.uploadReservation.findUnique({ where: { id: "cannot-delete" } }),
  ).not.toBeNull();
});
