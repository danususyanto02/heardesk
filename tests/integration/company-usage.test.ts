import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { reserveVisitorReport, releaseVisitorReservation, persistVisitorReport } from "@/modules/usage/infrastructure/prisma-visitor-usage";

let fixture: Awaited<ReturnType<typeof companyDatabase>>, siteId: number;
beforeAll(async () => {
  fixture = await companyDatabase(); await seedCompanies(fixture.db);
  siteId = (await fixture.db.site.create({ data: { name: "X", companyId: "x", origin: "https://x.test", publicKey: "x-key" } })).id;
  await fixture.db.companyLimits.update({ where: { companyId: "x" }, data: { monthlyReportLimit: 1 } });
});
afterAll(async () => { await fixture?.close(); });
it("concurrent last-report requests cannot exceed Company allowance", async () => {
  const outcomes = await Promise.allSettled(["one", "two"].map(submissionId => reserveVisitorReport(fixture.db, "x", siteId, submissionId, new Date("2026-10-05"))));
  expect(outcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.filter(outcome => outcome.status === "rejected")).toHaveLength(1);
  expect(await fixture.db.reportReservation.count()).toBe(1);
  const reservation = await fixture.db.reportReservation.findFirstOrThrow();
  await releaseVisitorReservation(fixture.db, "x", reservation.id);
});
it("identical duplicate is not charged twice and a changed payload conflicts", async () => {
  const reservation = await reserveVisitorReport(fixture.db, "x", siteId, "retry", new Date("2026-10-05"));
  const input = { siteId, submissionId: "retry", fingerprint: "same", type: "ISSUE" as const, message: "report" };
  expect(await persistVisitorReport(fixture.db, "x", reservation, input, null)).toEqual({ duplicate: false });
  expect(await persistVisitorReport(fixture.db, "x", reservation, input, null)).toEqual({ duplicate: true });
  await expect(persistVisitorReport(fixture.db, "x", reservation, { ...input, fingerprint: "different" }, null)).rejects.toMatchObject({ code: "SUBMISSION_CONFLICT" });
  expect((await fixture.db.reportUsagePeriod.findUniqueOrThrow({ where: { companyId_period: { companyId: "x", period: "2026-10" } } })).count).toBe(1);
  expect(await fixture.db.feedback.count()).toBe(1);
  const duplicate = await reserveVisitorReport(fixture.db, "x", siteId, "retry", new Date("2026-10-05"), "same");
  expect(duplicate).toEqual({ duplicate: true });
  await expect(reserveVisitorReport(fixture.db, "x", siteId, "retry", new Date("2026-10-05"), "changed")).rejects.toMatchObject({ code: "SUBMISSION_CONFLICT" });
});
it("expired report reservations release quota before admission", async () => {
  await fixture.db.reportReservation.create({ data: { id: "expired", companyId: "x", siteId, submissionId: "stale", period: "2026-09", expiresAt: new Date("2026-09-01") } });
  const reservation = await reserveVisitorReport(fixture.db, "x", siteId, "stale", new Date("2026-09-05"));
  expect(reservation.id).not.toBe("expired");
  await releaseVisitorReservation(fixture.db, "x", reservation.id);
});
it("suspension between allocation and commit rejects write and retains no report charge", async () => {
  const reservation = await reserveVisitorReport(fixture.db, "x", siteId, "suspend", new Date("2026-11-01"));
  await fixture.db.companyProfile.update({ where: { organizationId: "x" }, data: { status: "SUSPENDED" } });
  await expect(persistVisitorReport(fixture.db, "x", reservation, { siteId, submissionId: "suspend", fingerprint: "hash", type: "ISSUE", message: "blocked" }, null)).rejects.toMatchObject({ code: "COMPANY_SUSPENDED" });
  await releaseVisitorReservation(fixture.db, "x", reservation.id);
  expect(await fixture.db.feedback.count()).toBe(1);
  expect(await fixture.db.reportReservation.count()).toBe(0);
});
it("staged upload commits Company and global bytes exactly once", async () => {
  await fixture.db.companyProfile.update({ where: { organizationId: "x" }, data: { status: "ACTIVE" } });
  await fixture.db.storageBudget.create({ data: { id: 1 } });
  const reservation = await reserveVisitorReport(fixture.db, "x", siteId, "image", new Date("2026-12-01"));
  const staged = { id: "image-reservation", key: "image-file.webp", size: 123, mime: "image/webp", filename: "screenshot.webp" };
  await fixture.db.uploadReservation.create({ data: { id: staged.id, companyId: "x", bytes: 10485760n } });
  const input = { siteId, submissionId: "image", fingerprint: "image-hash", type: "ISSUE" as const, message: "image" };
  expect(await persistVisitorReport(fixture.db, "x", reservation, input, staged)).toEqual({ duplicate: false });
  expect(await persistVisitorReport(fixture.db, "x", reservation, input, staged)).toEqual({ duplicate: true });
  expect((await fixture.db.companyUsage.findUniqueOrThrow({ where: { companyId: "x" } })).storedBytes).toBe(123n);
  expect((await fixture.db.storageBudget.findUniqueOrThrow({ where: { id: 1 } })).used).toBe(123n);
  expect(await fixture.db.uploadReservation.count()).toBe(0);
});
it("lowered storage quota rolls back report, accounting and upload consumption", async () => {
  const reservation = await reserveVisitorReport(fixture.db, "x", siteId, "quota", new Date("2027-01-01"));
  const staged = { id: "quota-reservation", key: "quota-file.webp", size: 123, mime: "image/webp", filename: "screenshot.webp" };
  await fixture.db.uploadReservation.create({ data: { id: staged.id, companyId: "x", bytes: 10485760n } });
  await fixture.db.companyLimits.update({ where: { companyId: "x" }, data: { storageBytesLimit: 1n } });
  await expect(persistVisitorReport(fixture.db, "x", reservation, { siteId, submissionId: "quota", fingerprint: "hash", type: "ISSUE", message: "blocked" }, staged)).rejects.toMatchObject({ code: "COMPANY_QUOTA_EXCEEDED" });
  expect(await fixture.db.feedback.count({ where: { submissionId: "quota" } })).toBe(0);
  expect((await fixture.db.companyUsage.findUniqueOrThrow({ where: { companyId: "x" } })).storedBytes).toBe(123n);
  expect(await fixture.db.uploadReservation.count()).toBe(1);
  await fixture.db.uploadReservation.delete({ where: { id: staged.id } });
  await releaseVisitorReservation(fixture.db, "x", reservation.id);
});
