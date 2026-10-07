import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { createCompanyAccess } from "@/modules/companies/infrastructure/prisma-company-access";
import { feedbackRepository } from "@/modules/feedback/infrastructure/prisma-feedback-repository";
import { websiteRepository } from "@/modules/websites/infrastructure/prisma-website-repository";
import { companyFeedback } from "@/modules/feedback/application/company-feedback";
import { companyWebsites } from "@/modules/websites/application/company-websites";
import type { Actor } from "@/modules/identity/domain/session";
import type { AuthorizedCompany, Permission } from "@/modules/companies/domain/access";
import type { AuditWriter } from "@/modules/platform/domain/audit";

export function createCompanyServices(db: PrismaClient) {
  const access = createCompanyAccess(db);
  function repositories(tx: Prisma.TransactionClient) {
    const audit: AuditWriter = { async append(event) {
      await tx.auditEvent.create({ data: { actorId: event.actorId, actorSnapshot: event.actorId, companyId: event.companyId, action: event.action, resourceId: event.resourceId, createdAt: new Date(event.createdAt),
        ...(event.metadata ? { metadata: { ...(event.metadata.reason !== undefined ? { reason: event.metadata.reason } : {}), ...(event.metadata.previousRole !== undefined ? { previousRole: event.metadata.previousRole } : {}), ...(event.metadata.newRole !== undefined ? { newRole: event.metadata.newRole } : {}) } } : {}) } });
    } };
    return { feedback: feedbackRepository(tx), websites: websiteRepository(tx), audit };
  }
  type Repositories = ReturnType<typeof repositories>;
  const uow = {
    read: <T>(actor: Actor, companyId: string, permission: Permission, work: (scope: AuthorizedCompany, tx: Repositories) => Promise<T>) => access.read(actor, companyId, permission, (scope, tx) => work(scope, repositories(tx))),
    write: <T>(actor: Actor, companyId: string, permission: Permission, work: (scope: AuthorizedCompany, tx: Repositories) => Promise<T>) => access.write(actor, companyId, permission, (scope, tx) => work(scope, repositories(tx))),
  };
  return { ...companyFeedback(uow), ...companyWebsites(uow, { now: () => new Date() }) };
}
