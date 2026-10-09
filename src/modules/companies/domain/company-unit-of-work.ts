import type { Actor } from "../../identity/domain/session";
import type { FeedbackRepository } from "../../feedback/domain/feedback-repository";
import type { WebsiteRepository } from "../../websites/domain/website-repository";
import type { UsageRepository } from "../../usage/domain/usage";
import type { AuditWriter } from "../../platform/domain/audit";
import type { AccessSnapshot, AuthorizedCompany, CompanyId, Permission } from "./access";

export interface CompanyAccessReader {
  snapshot(companyId: CompanyId, userId: string): Promise<AccessSnapshot | null>;
}
export interface CompanyTransaction {
  access: CompanyAccessReader;
  feedback: FeedbackRepository;
  websites: WebsiteRepository;
  usage: UsageRepository;
  audit: AuditWriter;
}
export interface CompanyUnitOfWork<Repositories = CompanyTransaction> {
  read<T>(
    actor: Actor,
    companyId: CompanyId,
    permission: Permission,
    work: (scope: AuthorizedCompany, tx: Repositories) => Promise<T>,
  ): Promise<T>;
  write<T>(
    actor: Actor,
    companyId: CompanyId,
    permission: Permission,
    work: (scope: AuthorizedCompany, tx: Repositories) => Promise<T>,
  ): Promise<T>;
}
