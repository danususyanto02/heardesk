import { createHash, randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { CompanyOnboardingRepository, CompanySummary } from "../domain/onboarding";
import { CompanyAccessError } from "../domain/access";

export type DefaultCompanyLimits = Readonly<{ websiteLimit: number; seatLimit: number; monthlyReportLimit: number; storageBytesLimit: bigint }>;
export function prismaOnboarding(db: PrismaClient, limits: DefaultCompanyLimits): CompanyOnboardingRepository {
  return {
    async create(actor, input) {
      return db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${actor.userId} FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id: actor.userId } });
        if (!user?.emailVerified) throw new CompanyAccessError("EMAIL_NOT_VERIFIED");
        const fingerprint = createHash("sha256").update(input.name).digest("hex");
        const existing = await tx.companyCreationRequest.findUnique({ where: { userId_idempotencyKey: { userId: actor.userId, idempotencyKey: input.idempotencyKey } }, include: { company: { include: { profile: true } } } });
        if (existing) {
          if (existing.fingerprint !== fingerprint) throw Object.assign(new Error("Creation key already used for another Company"), { code: "IDEMPOTENCY_CONFLICT" });
          const membership = await tx.member.findUnique({ where: { organizationId_userId: { organizationId: existing.companyId, userId: actor.userId } } });
          if (!membership || !existing.company.profile) throw new CompanyAccessError("COMPANY_NOT_FOUND");
          return { id: existing.companyId, name: existing.company.name, role: membership.role, status: existing.company.profile.status };
        }
        const id = randomUUID();
        await tx.organization.create({ data: { id, name: input.name, slug: "company-" + id, profile: { create: {} }, limits: { create: limits }, usage: { create: {} }, members: { create: { id: randomUUID(), userId: actor.userId, role: "OWNER" } } } });
        await tx.companyCreationRequest.create({ data: { userId: actor.userId, idempotencyKey: input.idempotencyKey, fingerprint, companyId: id } });
        return { id, name: input.name, role: "OWNER", status: "ACTIVE" as const };
      });
    },
    async list(actor) {
      const user = await db.user.findUnique({ where: { id: actor.userId }, select: { emailVerified: true } });
      if (!user?.emailVerified) throw new CompanyAccessError("EMAIL_NOT_VERIFIED");
      const members = await db.member.findMany({ where: { userId: actor.userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { organization: { include: { profile: true } } } });
      return members.filter(member => member.organization.profile).map(member => ({ id: member.organizationId, name: member.organization.name, role: member.role, status: member.organization.profile!.status })) satisfies CompanySummary[];
    },
  };
}
