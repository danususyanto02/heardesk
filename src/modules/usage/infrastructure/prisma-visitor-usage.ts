import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { utcPeriod } from "../domain/quota-policy";
import type { ReportReservation, StagedFile } from "../domain/usage";
import type { FeedbackType } from "../../feedback/domain/feedback-repository";

function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
async function active(tx: Prisma.TransactionClient, companyId: string, siteId: number) {
  await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${companyId} FOR UPDATE`;
  const site = await tx.site.findFirst({ where: { id: siteId, companyId, company: { profile: { status: "ACTIVE" } } }, select: { id: true } });
  if (!site) fail("COMPANY_SUSPENDED");
}
export function reserveVisitorReport(db: PrismaClient, companyId: string, siteId: number, submissionId: string, now: Date): Promise<ReportReservation>;
export function reserveVisitorReport(db: PrismaClient, companyId: string, siteId: number, submissionId: string, now: Date, fingerprint: string): Promise<ReportReservation | { duplicate: true }>;
export async function reserveVisitorReport(db: PrismaClient, companyId: string, siteId: number, submissionId: string, now: Date, fingerprint?: string): Promise<ReportReservation | { duplicate: true }> {
  return db.$transaction(async tx => {
    await active(tx, companyId, siteId);
    if (fingerprint !== undefined) {
      const committed = await tx.feedback.findUnique({ where: { siteId_submissionId: { siteId, submissionId } } });
      if (committed) { if (committed.fingerprint !== fingerprint) fail("SUBMISSION_CONFLICT"); return { duplicate: true as const }; }
    }
    await tx.reportReservation.deleteMany({ where: { companyId, expiresAt: { lte: now } } });
    const period = utcPeriod(now);
    const existing = await tx.reportReservation.findUnique({ where: { siteId_submissionId: { siteId, submissionId } } });
    if (existing) fail("SUBMISSION_IN_PROGRESS");
    const quota = await tx.companyLimits.findUniqueOrThrow({ where: { companyId } });
    const used = await tx.reportUsagePeriod.findUnique({ where: { companyId_period: { companyId, period } } });
    const reserved = await tx.reportReservation.count({ where: { companyId, period } });
    if ((used?.count ?? 0) + reserved >= quota.monthlyReportLimit) fail("COMPANY_QUOTA_EXCEEDED");
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const row = await tx.reportReservation.create({ data: { id: randomUUID(), companyId, siteId, submissionId, period, expiresAt } });
    return { ...row, expiresAt: row.expiresAt.toISOString() };
  });
}
export async function releaseVisitorReservation(db: PrismaClient, companyId: string, id: string) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${companyId} FOR UPDATE`;
    await tx.reportReservation.deleteMany({ where: { id, companyId } });
  });
}
export type VisitorReport = Readonly<{ siteId: number; submissionId: string; fingerprint: string; type: FeedbackType; message: string; email?: string; pageUrl?: string }>;
export async function persistVisitorReport(db: PrismaClient, companyId: string, reservation: ReportReservation, input: VisitorReport, staged: StagedFile | null) {
  return db.$transaction(async tx => {
    await active(tx, companyId, input.siteId);
    const existing = await tx.feedback.findUnique({ where: { siteId_submissionId: { siteId: input.siteId, submissionId: input.submissionId } } });
    if (existing) { if (existing.fingerprint !== input.fingerprint) fail("SUBMISSION_CONFLICT"); return { duplicate: true }; }
    if (reservation.companyId !== companyId || reservation.siteId !== input.siteId || reservation.submissionId !== input.submissionId) fail("RESERVATION_INVALID");
    const held = await tx.reportReservation.findFirst({ where: { id: reservation.id, companyId, siteId: input.siteId, submissionId: input.submissionId } });
    if (!held) fail("RESERVATION_INVALID");
    const limits = await tx.companyLimits.findUniqueOrThrow({ where: { companyId } });
    const period = await tx.reportUsagePeriod.findUnique({ where: { companyId_period: { companyId, period: held.period } } });
    if ((period?.count ?? 0) >= limits.monthlyReportLimit) fail("COMPANY_QUOTA_EXCEEDED");
    if (staged) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(178232)`;
      const upload = await tx.uploadReservation.findFirst({ where: { id: staged.id, companyId } });
      const usage = await tx.companyUsage.findUniqueOrThrow({ where: { companyId } });
      if (!upload || usage.storedBytes + BigInt(staged.size) > limits.storageBytesLimit) fail("COMPANY_QUOTA_EXCEEDED");
    }
    await tx.feedback.create({ data: { ...input, attachment: staged ? { create: { key: staged.key, size: staged.size, mime: staged.mime, filename: staged.filename } } : undefined } });
    await tx.reportUsagePeriod.upsert({ where: { companyId_period: { companyId, period: held.period } }, create: { companyId, period: held.period, count: 1 }, update: { count: { increment: 1 } } });
    if (staged) {
      await tx.companyUsage.update({ where: { companyId }, data: { storedBytes: { increment: staged.size } } });
      await tx.storageBudget.update({ where: { id: 1 }, data: { used: { increment: staged.size } } });
      await tx.uploadReservation.delete({ where: { id: staged.id } });
    }
    await tx.reportReservation.delete({ where: { id: reservation.id } });
    return { duplicate: false };
  });
}
