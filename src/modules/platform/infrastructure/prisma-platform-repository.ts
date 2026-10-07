import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type { PlatformRepository, PlatformCompany, PlatformQuery, PlatformPage } from "../domain/platform-repository";

function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
const companySelect = {
  id: true, name: true, createdAt: true, profile: { select: { status: true, statusReason: true, updatedAt: true } },
  limits: { select: { websiteLimit: true, seatLimit: true, monthlyReportLimit: true, storageBytesLimit: true } }, usage: { select: { storedBytes: true } },
  members: { where: { role: "OWNER" }, select: { user: { select: { id: true, name: true, email: true } } } },
  _count: { select: { members: true, sites: true } },
} satisfies Prisma.OrganizationSelect;
type CompanyRow = Prisma.OrganizationGetPayload<{ select: typeof companySelect }>;

export function prismaPlatformRepository(db: PrismaClient): PlatformRepository {
  async function transaction<T>(actorId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${actorId} FOR SHARE`;
      const user = await tx.user.findUnique({ where: { id: actorId }, select: { emailVerified: true, platformRole: true } });
      if (!user?.emailVerified || user.platformRole !== "PLATFORM_OWNER") fail("PLATFORM_FORBIDDEN");
      return work(tx);
    }, { timeout: 15000 });
  }
  async function companyDto(tx: Prisma.TransactionClient, row: CompanyRow): Promise<PlatformCompany> {
    if (!row.profile || !row.limits || !row.usage) fail("PLATFORM_COMPANY_INCOMPLETE");
    const period = new Date().toISOString().slice(0, 7);
    const reports = await tx.feedback.count({ where: { site: { companyId: row.id } } });
    const usage = await tx.reportUsagePeriod.findUnique({ where: { companyId_period: { companyId: row.id, period } }, select: { count: true } });
    return { id: row.id, name: row.name, status: row.profile.status, reason: row.profile.statusReason, createdAt: row.createdAt.toISOString(), updatedAt: row.profile.updatedAt.toISOString(), owners: row.members.map(member => member.user), members: row._count.members, websites: row._count.sites, reports, monthlyReports: usage?.count ?? 0, period, storedBytes: row.usage.storedBytes.toString(), limits: { websites: row.limits.websiteLimit, seats: row.limits.seatLimit, monthlyReports: row.limits.monthlyReportLimit, storageBytes: row.limits.storageBytesLimit.toString() } };
  }
  async function find(tx: Prisma.TransactionClient, id: string) { const row = await tx.organization.findUnique({ where: { id }, select: companySelect }); if (!row) fail("PLATFORM_NOT_FOUND"); return companyDto(tx, row); }
  function pagination<T>(items: readonly T[], total: number, page: number): PlatformPage<T> { return { items, total, page, pageSize: 20 }; }
  function pageFor(total: number, query: PlatformQuery) { return Math.min(query.page, Math.max(1, Math.ceil(total / 20))); }
  async function lockCompany(tx: Prisma.TransactionClient, id: string, expectedUpdatedAt: string) {
    await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${id} FOR UPDATE`;
    const profile = await tx.companyProfile.findUnique({ where: { organizationId: id } });
    if (!profile) fail("PLATFORM_NOT_FOUND");
    if (profile.updatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) fail("PLATFORM_CONFLICT");
    return profile;
  }
  return {
    overview: actorId => transaction(actorId, async tx => {
      const companies = await tx.organization.count(), activeCompanies = await tx.companyProfile.count({ where: { status: "ACTIVE" } }), suspendedCompanies = await tx.companyProfile.count({ where: { status: "SUSPENDED" } }), users = await tx.user.count(), websites = await tx.site.count(), reports = await tx.feedback.count(), bytes = await tx.companyUsage.aggregate({ _sum: { storedBytes: true } });
      return { companies, activeCompanies, suspendedCompanies, users, websites, reports, storedBytes: (bytes._sum.storedBytes ?? 0n).toString() };
    }),
    companies: (actorId, query) => transaction(actorId, async tx => {
      const where: Prisma.OrganizationWhereInput = query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { id: { contains: query.q, mode: "insensitive" } }] } : {};
      const total = await tx.organization.count({ where }), page = pageFor(total, query);
      const rows = await tx.organization.findMany({ where, select: companySelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20 });
      const items: PlatformCompany[] = [];
      for (const row of rows) items.push(await companyDto(tx, row));
      return pagination(items, total, page);
    }),
    company: (actorId, id) => transaction(actorId, tx => find(tx, id)),
    users: (actorId, query) => transaction(actorId, async tx => {
      const where: Prisma.UserWhereInput = query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { email: { contains: query.q, mode: "insensitive" } }] } : {};
      const total = await tx.user.count({ where }), page = pageFor(total, query);
      const rows = await tx.user.findMany({ where, select: { id: true, name: true, email: true, emailVerified: true, platformRole: true, createdAt: true, memberships: { select: { role: true, organization: { select: { id: true, name: true } } } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20 });
      return pagination(rows.map(row => ({ id: row.id, name: row.name, email: row.email, emailVerified: row.emailVerified, platformRole: row.platformRole, createdAt: row.createdAt.toISOString(), companies: row.memberships.map(member => ({ ...member.organization, role: member.role })) })), total, page);
    }),
    audit: (actorId, query) => transaction(actorId, async tx => {
      const where: Prisma.AuditEventWhereInput = query.q ? { OR: [{ action: { contains: query.q, mode: "insensitive" } }, { company: { name: { contains: query.q, mode: "insensitive" } } }] } : {};
      const total = await tx.auditEvent.count({ where }), page = pageFor(total, query);
      const rows = await tx.auditEvent.findMany({ where, select: { id: true, actorSnapshot: true, companyId: true, action: true, resourceId: true, metadata: true, createdAt: true, company: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20 });
      return pagination(rows.map(row => {
        const metadata = row.metadata; const reason = metadata && typeof metadata === "object" && !Array.isArray(metadata) && typeof metadata.reason === "string" ? metadata.reason : null;
        return { id: row.id, actorId: row.actorSnapshot, companyId: row.companyId, companyName: row.company?.name ?? null, action: row.action, resourceId: row.resourceId, reason, createdAt: row.createdAt.toISOString() };
      }), total, page);
    }),
    setStatus: (actorId, id, input) => transaction(actorId, async tx => {
      const previous = await lockCompany(tx, id, input.expectedUpdatedAt);
      if (previous.status === input.status) fail("PLATFORM_CONFLICT");
      const updatedAt = new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1));
      await tx.companyProfile.update({ where: { organizationId: id }, data: { status: input.status, statusReason: input.reason, updatedAt } });
      await tx.auditEvent.create({ data: { actorId, actorSnapshot: actorId, companyId: id, action: input.status === "SUSPENDED" ? "COMPANY_SUSPENDED" : "COMPANY_REACTIVATED", resourceId: id, metadata: { reason: input.reason } } });
      return find(tx, id);
    }),
    setLimits: (actorId, id, input) => transaction(actorId, async tx => {
      const previous = await lockCompany(tx, id, input.expectedUpdatedAt);
      await tx.companyLimits.update({ where: { companyId: id }, data: { websiteLimit: input.websites, seatLimit: input.seats, monthlyReportLimit: input.monthlyReports, storageBytesLimit: BigInt(input.storageBytes) } });
      await tx.companyProfile.update({ where: { organizationId: id }, data: { updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)) } });
      await tx.auditEvent.create({ data: { actorId, actorSnapshot: actorId, companyId: id, action: "COMPANY_LIMITS_CHANGED", resourceId: id, metadata: { reason: input.reason } } });
      return find(tx, id);
    }),
  };
}
