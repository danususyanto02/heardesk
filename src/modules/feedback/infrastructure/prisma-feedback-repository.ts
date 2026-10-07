import type { Prisma } from "@/generated/prisma/client";
import type { FeedbackRepository, FeedbackItem } from "../domain/feedback-repository";
import { CompanyAccessError } from "../../companies/domain/access";

export function feedbackRepository(tx: Prisma.TransactionClient): FeedbackRepository {
  function item(row: { id: string; message: string; type: FeedbackItem["type"]; status: FeedbackItem["status"]; siteId: number; createdAt: Date; attachment: { id: string } | null }): FeedbackItem {
    return { id: row.id, message: row.message, type: row.type, status: row.status, siteId: row.siteId, createdAt: row.createdAt.toISOString(), attachmentId: row.attachment?.id ?? null };
  }
  return {
    async list(scope, query) {
      if (query.siteId && !await tx.site.findFirst({ where: { id: query.siteId, companyId: scope.companyId } })) throw new CompanyAccessError("RESOURCE_NOT_FOUND");
      const where: Prisma.FeedbackWhereInput = { site: { companyId: scope.companyId }, ...(query.siteId ? { siteId: query.siteId } : {}), type: query.type, status: query.status,
        ...(query.q ? { message: { contains: query.q, mode: "insensitive" } } : {}), ...(query.from || query.to ? { createdAt: { gte: query.from ? new Date(query.from) : undefined, lt: query.to ? new Date(query.to) : undefined } } : {}) };
      const total = await tx.feedback.count({ where }), page = Math.min(query.page, Math.max(1, Math.ceil(total / 20)));
      const rows = await tx.feedback.findMany({ where, take: 20, skip: (page - 1) * 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { attachment: { select: { id: true } } } });
      return { items: rows.map(item), total, page, pageSize: 20 };
    },
    async detail(scope, id) {
      const row = await tx.feedback.findFirst({ where: { id, site: { companyId: scope.companyId } }, include: { attachment: true, notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } } } });
      return row ? { ...item(row), email: row.email, pageUrl: row.pageUrl, attachment: row.attachment ? { id: row.attachment.id, filename: row.attachment.filename, mime: row.attachment.mime, size: row.attachment.size } : null,
        notes: row.notes.map(note => ({ id: note.id, body: note.body, author: note.author, createdAt: note.createdAt.toISOString() })) } : null;
    },
    async setStatus(scope, id, status) {
      const result = await tx.feedback.updateMany({ where: { id, site: { companyId: scope.companyId } }, data: { status } });
      return result.count ? { id, status } : null;
    },
    async addNote(scope, id, body) {
      if (!await tx.feedback.findFirst({ where: { id, site: { companyId: scope.companyId } }, select: { id: true } })) return null;
      const row = await tx.internalNote.create({ data: { feedbackId: id, authorId: scope.actorId, body }, include: { author: { select: { id: true, name: true } } } });
      return { id: row.id, body: row.body, author: row.author, createdAt: row.createdAt.toISOString() };
    },
    async attachment(scope, id) {
      const row = await tx.attachment.findFirst({ where: { id, feedback: { site: { companyId: scope.companyId } } } });
      return row ? { key: row.key, mime: row.mime, filename: row.filename, size: row.size } : null;
    },
  };
}
