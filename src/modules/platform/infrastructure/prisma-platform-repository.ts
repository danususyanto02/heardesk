import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import type {
  PlatformRepository,
  PlatformCompany,
  PlatformQuery,
  PlatformPage,
} from "../domain/platform-repository";
import { pagination as pageWindow } from "../../shared/domain/pagination";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}
const companySelect = {
  id: true,
  name: true,
  createdAt: true,
  profile: { select: { status: true, statusReason: true, updatedAt: true } },
  limits: {
    select: {
      websiteLimit: true,
      seatLimit: true,
      monthlyReportLimit: true,
      storageBytesLimit: true,
    },
  },
  usage: { select: { storedBytes: true } },
  members: {
    where: { role: "OWNER" },
    take: 5,
    orderBy: { id: "asc" },
    select: { user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { members: true, sites: true } },
} satisfies Prisma.OrganizationSelect;
type CompanyRow = Prisma.OrganizationGetPayload<{ select: typeof companySelect }>;

async function companyDto(
  tx: Prisma.TransactionClient,
  row: CompanyRow,
  counts?: { reports: number; monthlyReports: number; reservedSeats: number },
): Promise<PlatformCompany> {
  if (!row.profile || !row.limits || !row.usage) {
    fail("PLATFORM_COMPANY_INCOMPLETE");
  }
  const period = new Date().toISOString().slice(0, 7);
  const reports =
    counts?.reports ?? (await tx.feedback.count({ where: { site: { companyId: row.id } } }));
  const monthlyReports =
    counts?.monthlyReports ??
    (
      await tx.reportUsagePeriod.findUnique({
        where: { companyId_period: { companyId: row.id, period } },
        select: { count: true },
      })
    )?.count ??
    0;
  const reservedSeats =
    counts?.reservedSeats ??
    Number(
      (
        await tx.$queryRaw<
          { count: bigint }[]
        >`SELECT count(DISTINCT lower(i.email)) AS count FROM invitation i WHERE i."organizationId"=${row.id} AND i.status='pending' AND i."expiresAt">${new Date()} AND NOT EXISTS (SELECT 1 FROM member m JOIN "user" u ON u.id=m."userId" WHERE m."organizationId"=i."organizationId" AND lower(u.email)=lower(i.email))`
      )[0]?.count ?? 0n,
    );
  return {
    id: row.id,
    name: row.name,
    status: row.profile.status,
    reason: row.profile.statusReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.profile.updatedAt.toISOString(),
    owners: row.members.map((member) => member.user),
    members: row._count.members,
    occupiedSeats: row._count.members + reservedSeats,
    websites: row._count.sites,
    reports,
    monthlyReports,
    period,
    storedBytes: row.usage.storedBytes.toString(),
    limits: {
      websites: row.limits.websiteLimit,
      seats: row.limits.seatLimit,
      monthlyReports: row.limits.monthlyReportLimit,
      storageBytes: row.limits.storageBytesLimit.toString(),
    },
  };
}
async function find(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.organization.findUnique({ where: { id }, select: companySelect });
  if (!row) {
    fail("PLATFORM_NOT_FOUND");
  }
  return companyDto(tx, row);
}
function pagination<T>(items: readonly T[], total: number, query: PlatformQuery): PlatformPage<T> {
  const { page, pageSize } = pageWindow(total, query.page, query.pageSize);
  return { items, total, page, pageSize };
}
async function lockCompany(tx: Prisma.TransactionClient, id: string, expectedUpdatedAt: string) {
  await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${id} FOR UPDATE`;
  const profile = await tx.companyProfile.findUnique({ where: { organizationId: id } });
  if (!profile) {
    fail("PLATFORM_NOT_FOUND");
  }
  if (profile.updatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
    fail("PLATFORM_CONFLICT");
  }
  return profile;
}
export function prismaPlatformRepository(db: PrismaClient): PlatformRepository {
  async function transaction<T>(
    actorId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${actorId} FOR SHARE`;
        const user = await tx.user.findUnique({
          where: { id: actorId },
          select: { emailVerified: true, platformRole: true, accountStatus: true },
        });
        if (
          !user?.emailVerified ||
          user.platformRole !== "PLATFORM_OWNER" ||
          user.accountStatus !== "ACTIVE"
        ) {
          fail("PLATFORM_FORBIDDEN");
        }
        return work(tx);
      },
      { timeout: 15000 },
    );
  }
  return {
    overview: (actorId) =>
      transaction(actorId, async (tx) => {
        const companies = await tx.organization.count();
        const activeCompanies = await tx.companyProfile.count({ where: { status: "ACTIVE" } });
        const suspendedCompanies = await tx.companyProfile.count({
          where: { status: "SUSPENDED" },
        });
        const users = await tx.user.count();
        const websites = await tx.site.count();
        const reports = await tx.feedback.count();
        const bytes = await tx.companyUsage.aggregate({ _sum: { storedBytes: true } });
        return {
          companies,
          activeCompanies,
          suspendedCompanies,
          users,
          websites,
          reports,
          storedBytes: (bytes._sum.storedBytes ?? 0n).toString(),
        };
      }),
    companies: (actorId, query) =>
      transaction(actorId, async (tx) => {
        const where: Prisma.OrganizationWhereInput = query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { id: { contains: query.q, mode: "insensitive" } },
              ],
            }
          : {};
        const total = await tx.organization.count({ where });
        const { take, skip } = pageWindow(total, query.page, query.pageSize);
        const rows = await tx.organization.findMany({
          where,
          select: companySelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take,
          skip,
        });
        const ids = rows.map((row) => row.id);
        const grouped = ids.length
          ? await tx.$queryRaw<
              { companyId: string; reports: bigint }[]
            >`SELECT s."companyId",count(f.id) AS reports FROM "Site" s LEFT JOIN "Feedback" f ON f."siteId"=s.id WHERE s."companyId" = ANY(${ids}::text[]) GROUP BY s."companyId"`
          : [];
        const period = new Date().toISOString().slice(0, 7);
        const periods = await tx.reportUsagePeriod.findMany({
          where: { companyId: { in: ids }, period },
          select: { companyId: true, count: true },
        });
        const reportCounts = new Map(grouped.map((row) => [row.companyId, Number(row.reports)]));
        const monthCounts = new Map(periods.map((row) => [row.companyId, row.count]));
        const reserved = ids.length
          ? await tx.$queryRaw<
              { companyId: string; count: bigint }[]
            >`SELECT i."organizationId" AS "companyId",count(DISTINCT lower(i.email)) AS count FROM invitation i WHERE i."organizationId" = ANY(${ids}::text[]) AND i.status='pending' AND i."expiresAt">${new Date()} AND NOT EXISTS (SELECT 1 FROM member m JOIN "user" u ON u.id=m."userId" WHERE m."organizationId"=i."organizationId" AND lower(u.email)=lower(i.email)) GROUP BY 1`
          : [];
        const seatCounts = new Map(reserved.map((row) => [row.companyId, Number(row.count)]));
        const items: PlatformCompany[] = [];
        for (const row of rows) {
          items.push(
            await companyDto(tx, row, {
              reports: reportCounts.get(row.id) ?? 0,
              monthlyReports: monthCounts.get(row.id) ?? 0,
              reservedSeats: seatCounts.get(row.id) ?? 0,
            }),
          );
        }
        return pagination(items, total, query);
      }),
    company: (actorId, id) => transaction(actorId, (tx) => find(tx, id)),
    users: (actorId, query) =>
      transaction(actorId, async (tx) => {
        const where: Prisma.UserWhereInput = query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { email: { contains: query.q, mode: "insensitive" } },
              ],
            }
          : {};
        const total = await tx.user.count({ where });
        const { take, skip } = pageWindow(total, query.page, query.pageSize);
        const rows = await tx.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            platformRole: true,
            accountStatus: true,
            _count: { select: { memberships: true } },
            createdAt: true,
            memberships: {
              take: 5,
              orderBy: { id: "asc" },
              select: { role: true, organization: { select: { id: true, name: true } } },
            },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take,
          skip,
        });
        return pagination(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            emailVerified: row.emailVerified,
            platformRole: row.platformRole,
            accountStatus: row.accountStatus,
            membershipCount: row._count.memberships,
            createdAt: row.createdAt.toISOString(),
            companies: row.memberships.map((member) => ({
              ...member.organization,
              role: member.role,
            })),
          })),
          total,
          query,
        );
      }),
    audit: (actorId, query) =>
      transaction(actorId, async (tx) => {
        const where: Prisma.AuditEventWhereInput = query.q
          ? {
              OR: [
                { action: { contains: query.q, mode: "insensitive" } },
                { company: { name: { contains: query.q, mode: "insensitive" } } },
              ],
            }
          : {};
        const total = await tx.auditEvent.count({ where });
        const { take, skip } = pageWindow(total, query.page, query.pageSize);
        const rows = await tx.auditEvent.findMany({
          where,
          select: {
            id: true,
            actorSnapshot: true,
            companyId: true,
            action: true,
            resourceId: true,
            metadata: true,
            createdAt: true,
            company: { select: { name: true } },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take,
          skip,
        });
        return pagination(
          rows.map((row) => {
            const metadata = row.metadata;
            const reason =
              metadata &&
              typeof metadata === "object" &&
              !Array.isArray(metadata) &&
              typeof metadata.reason === "string"
                ? metadata.reason
                : null;
            return {
              id: row.id,
              actorId: row.actorSnapshot,
              companyId: row.companyId,
              companyName: row.company?.name ?? null,
              action: row.action,
              resourceId: row.resourceId,
              reason,
              createdAt: row.createdAt.toISOString(),
            };
          }),
          total,
          query,
        );
      }),
    setStatus: (actorId, id, input) =>
      transaction(actorId, async (tx) => {
        const previous = await lockCompany(tx, id, input.expectedUpdatedAt);
        if (previous.status === input.status) {
          fail("PLATFORM_CONFLICT");
        }
        const updatedAt = new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1));
        await tx.companyProfile.update({
          where: { organizationId: id },
          data: { status: input.status, statusReason: input.reason, updatedAt },
        });
        await tx.auditEvent.create({
          data: {
            actorId,
            actorSnapshot: actorId,
            companyId: id,
            action: input.status === "SUSPENDED" ? "COMPANY_SUSPENDED" : "COMPANY_REACTIVATED",
            resourceId: id,
            metadata: { reason: input.reason },
          },
        });
        return find(tx, id);
      }),
    setLimits: (actorId, id, input) =>
      transaction(actorId, async (tx) => {
        const previous = await lockCompany(tx, id, input.expectedUpdatedAt);
        await tx.companyLimits.update({
          where: { companyId: id },
          data: {
            websiteLimit: input.websites,
            seatLimit: input.seats,
            monthlyReportLimit: input.monthlyReports,
            storageBytesLimit: BigInt(input.storageBytes),
          },
        });
        await tx.companyProfile.update({
          where: { organizationId: id },
          data: { updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)) },
        });
        await tx.auditEvent.create({
          data: {
            actorId,
            actorSnapshot: actorId,
            companyId: id,
            action: "COMPANY_LIMITS_CHANGED",
            resourceId: id,
            metadata: { reason: input.reason },
          },
        });
        return find(tx, id);
      }),
  };
}
