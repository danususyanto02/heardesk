import type { PrismaClient } from "@/generated/prisma/client";
import { quotaAvailable } from "../domain/quota-policy";

export type PhysicalCapacity = Readonly<{ free: bigint; floor: bigint; quota: bigint }>;
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
export async function reserveUploadCapacity(db: PrismaClient, companyId: string, id: string, needed: bigint, physical: () => Promise<PhysicalCapacity>): Promise<void> {
  if (needed <= 0n) fail("UPLOAD_CAPACITY_UNAVAILABLE");
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${companyId} FOR UPDATE`;
    const profile = await tx.companyProfile.findUnique({ where: { organizationId: companyId } });
    if (profile?.status !== "ACTIVE") fail("COMPANY_SUSPENDED");
    const limits = await tx.companyLimits.findUniqueOrThrow({ where: { companyId } });
    const used = await tx.companyUsage.findUniqueOrThrow({ where: { companyId } });
    const reserved = await tx.uploadReservation.aggregate({ where: { companyId }, _sum: { bytes: true } });
    if (!quotaAvailable(used.storedBytes, reserved._sum.bytes ?? 0n, needed, limits.storageBytesLimit)) fail("COMPANY_QUOTA_EXCEEDED");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(178232)`;
    const global = await tx.storageBudget.findUniqueOrThrow({ where: { id: 1 } });
    const total = await tx.uploadReservation.aggregate({ _sum: { bytes: true } });
    const capacity = await physical();
    if (capacity.free - (total._sum.bytes ?? 0n) - needed < capacity.floor || !quotaAvailable(global.used, total._sum.bytes ?? 0n, needed, capacity.quota)) fail("UPLOAD_CAPACITY_UNAVAILABLE");
    await tx.uploadReservation.create({ data: { id, companyId, bytes: needed } });
  });
}
