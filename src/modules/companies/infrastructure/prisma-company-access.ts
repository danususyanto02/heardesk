import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { Actor } from "../../identity/domain/session";
import type { CompanyId, CompanyRole, Permission, AuthorizedCompany } from "../domain/access";
import { authorizeCompany } from "../application/authorize-company";

export function createCompanyAccess(db: PrismaClient) {
  async function run<T>(write: boolean, actor: Actor, companyId: CompanyId, permission: Permission, work: (scope: AuthorizedCompany, tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return db.$transaction(async tx => {
      if (write) await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${companyId} FOR UPDATE`;
      const member = await tx.member.findUnique({ where: { organizationId_userId: { organizationId: companyId, userId: actor.userId } }, include: { organization: { select: { profile: true } } } });
      const profile = member?.organization.profile;
      const snapshot = member && profile ? { companyId, userId: member.userId, role: member.role as CompanyRole, status: profile.status } : null;
      return work(authorizeCompany(actor, companyId, snapshot, permission), tx);
    }, { timeout: 15000 });
  }
  return {
    read: <T>(actor: Actor, companyId: CompanyId, permission: Permission, work: (scope: AuthorizedCompany, tx: Prisma.TransactionClient) => Promise<T>) => run(false, actor, companyId, permission, work),
    write: <T>(actor: Actor, companyId: CompanyId, permission: Permission, work: (scope: AuthorizedCompany, tx: Prisma.TransactionClient) => Promise<T>) => run(true, actor, companyId, permission, work),
  };
}
