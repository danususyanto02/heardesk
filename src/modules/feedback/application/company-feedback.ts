import type { Actor } from "../../identity/domain/session";
import type { CompanyUnitOfWork } from "../../companies/domain/company-unit-of-work";
import { CompanyAccessError } from "../../companies/domain/access";
import type { FeedbackQuery, FeedbackStatus, FeedbackRepository } from "../domain/feedback-repository";

function found<T>(value: T | null): T { if (value === null) throw new CompanyAccessError("RESOURCE_NOT_FOUND"); return value; }
export function companyFeedback(uow: CompanyUnitOfWork<{ feedback: FeedbackRepository }>) {
  return {
    listFeedback: (actor: Actor, companyId: string, query: FeedbackQuery) => uow.read(actor, companyId, "feedback:read", (scope, tx) => tx.feedback.list(scope, query)),
    getFeedback: (actor: Actor, companyId: string, id: string) => uow.read(actor, companyId, "feedback:read", async (scope, tx) => found(await tx.feedback.detail(scope, id))),
    changeStatus: (actor: Actor, companyId: string, id: string, status: FeedbackStatus) => uow.write(actor, companyId, "feedback:status", async (scope, tx) => found(await tx.feedback.setStatus(scope, id, status))),
    addNote: (actor: Actor, companyId: string, id: string, body: string) => uow.write(actor, companyId, "feedback:note", async (scope, tx) => found(await tx.feedback.addNote(scope, id, body))),
    attachment: (actor: Actor, companyId: string, id: string) => uow.read(actor, companyId, "feedback:read", async (scope, tx) => found(await tx.feedback.attachment(scope, id))),
  };
}
