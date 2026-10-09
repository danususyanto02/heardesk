import { randomBytes, createHash } from "node:crypto";
import type {
  PrismaClient,
  Prisma,
  FeedbackStatus,
  FeedbackType,
} from "../src/generated/prisma/client";

const companies = [
  {
    slug: "northstar",
    name: "Northstar Commerce",
    websites: ["Storefront", "Merchant Portal"],
    limits: {
      websiteLimit: 3,
      seatLimit: 5,
      monthlyReportLimit: 1000,
      storageBytesLimit: 1073741824n,
    },
  },
  {
    slug: "paperplane",
    name: "Paperplane Studio",
    websites: ["Portfolio", "Client Workspace"],
    limits: {
      websiteLimit: 2,
      seatLimit: 5,
      monthlyReportLimit: 100,
      storageBytesLimit: 268435456n,
    },
  },
  {
    slug: "orbit",
    name: "Orbit Learning",
    websites: ["Course Catalog", "Student Portal"],
    limits: {
      websiteLimit: 5,
      seatLimit: 10,
      monthlyReportLimit: 5000,
      storageBytesLimit: 2147483648n,
    },
  },
  {
    slug: "harbor",
    name: "Harbor Booking",
    websites: ["Reservations", "Partner Dashboard"],
    limits: {
      websiteLimit: 3,
      seatLimit: 5,
      monthlyReportLimit: 500,
      storageBytesLimit: 536870912n,
    },
  },
] as const;
const messages: readonly { type: FeedbackType; message: string }[] = [
  {
    type: "ISSUE",
    message: "The confirmation button does not respond on mobile after selecting a date.",
  },
  { type: "SUGGESTION", message: "Please add a way to save items and return to them later." },
  { type: "COMPLIMENT", message: "The new navigation makes it much easier to find what I need." },
  { type: "ISSUE", message: "Search results disappear when I use the browser back button." },
  { type: "SUGGESTION", message: "A dark theme would help when working in the evening." },
  { type: "ISSUE", message: "The page takes too long to load after changing filters." },
  {
    type: "COMPLIMENT",
    message: "The instructions were clear and I finished without asking for help.",
  },
  { type: "SUGGESTION", message: "Let me download a copy of the confirmation as a PDF." },
  { type: "ISSUE", message: "An error message covers the input field on smaller screens." },
  { type: "SUGGESTION", message: "Please remember my preferred language between visits." },
  {
    type: "COMPLIMENT",
    message: "Customer information is presented clearly in the redesigned view.",
  },
  { type: "ISSUE", message: "Keyboard focus is lost when I close the details panel." },
];
const statuses: readonly FeedbackStatus[] = ["NEW", "REVIEWING", "DONE", "ARCHIVED"];

async function ensureCompany(
  tx: Prisma.TransactionClient,
  id: string,
  slug: string,
  name: string,
  createdAt: Date,
) {
  const existing = await tx.organization.findUnique({ where: { id } });
  if (existing) {
    let metadata;
    try {
      metadata = JSON.parse(existing.metadata ?? "null");
    } catch {
      throw new Error("Demo Company ID belongs to other data.");
    }
    if (metadata?.seed !== "heardesk-demo-v1") {
      throw new Error("Demo Company ID belongs to other data.");
    }
    return;
  }
  await tx.organization.create({
    data: {
      id,
      slug,
      name: name + " (Demo)",
      createdAt,
      metadata: JSON.stringify({ seed: "heardesk-demo-v1", illustrative: true }),
    },
  });
}

type DemoCompany = (typeof companies)[number];

async function seedCompany(
  tx: Prisma.TransactionClient,
  company: DemoCompany,
  companyIndex: number,
  ownerId: string,
  now: Date,
) {
  const companyId = "heardesk-demo-" + company.slug;
  await ensureCompany(
    tx,
    companyId,
    "heardesk-demo-" + company.slug,
    company.name,
    new Date(now.getTime() - (companyIndex + 1) * 7 * 86400000),
  );
  await tx.companyProfile.upsert({
    where: { organizationId: companyId },
    create: {
      organizationId: companyId,
      status: company.slug === "harbor" ? "SUSPENDED" : "ACTIVE",
      statusReason: company.slug === "harbor" ? "[Demo] Example suspended client account" : null,
    },
    update: {},
  });
  await tx.$queryRaw`SELECT "organizationId" FROM "CompanyProfile" WHERE "organizationId" = ${companyId} FOR UPDATE`;
  await tx.companyLimits.upsert({
    where: { companyId },
    create: { companyId, ...company.limits },
    update: {},
  });
  await tx.companyUsage.upsert({
    where: { companyId },
    create: { companyId, storedBytes: 0n },
    update: {},
  });
  await tx.member.upsert({
    where: { organizationId_userId: { organizationId: companyId, userId: ownerId } },
    create: {
      id: companyId + "-platform-owner",
      organizationId: companyId,
      userId: ownerId,
      role: "OWNER",
    },
    update: {},
  });
}

async function seedMembers(
  tx: Prisma.TransactionClient,
  company: DemoCompany,
  companyId: string,
  now: Date,
) {
  for (const role of ["ADMIN", "AGENT", "VIEWER"] as const) {
    const userId = `${companyId}-${role.toLowerCase()}`;
    const email = `${role.toLowerCase()}@${company.slug}.example.test`;
    const existing = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true, platformRole: true },
    });
    if (existing && (existing.email !== email || existing.platformRole !== "USER")) {
      throw new Error("Demo user ID belongs to other data.");
    }
    await tx.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        name: `${company.name} ${role.charAt(0) + role.slice(1).toLowerCase()} (Demo)`,
        email,
        emailVerified: false,
        createdAt: new Date(now.getTime() - 7 * 86400000),
      },
      update: {},
    });
    await tx.member.upsert({
      where: { organizationId_userId: { organizationId: companyId, userId: userId } },
      create: { id: userId + "-membership", organizationId: companyId, userId, role },
      update: {},
    });
  }
}

async function seedWebsites(
  tx: Prisma.TransactionClient,
  company: DemoCompany,
  companyId: string,
): Promise<number[]> {
  const sites: number[] = [];
  for (const [siteIndex, siteName] of company.websites.entries()) {
    const origin = `https://${company.slug}-${siteIndex ? "portal" : "website"}.example.test`;
    let site = await tx.site.findUnique({
      where: { companyId_origin: { companyId, origin } },
    });
    if (!site) {
      site = await tx.site.create({
        data: {
          companyId,
          name: siteName + " (Demo)",
          origin,
          publicKey: randomBytes(24).toString("base64url"),
          buttonLabel: "Send feedback",
          position: siteIndex ? "left" : "right",
        },
      });
    }
    sites.push(site.id);
  }
  return sites;
}

async function seedReports(
  tx: Prisma.TransactionClient,
  company: DemoCompany,
  companyId: string,
  companyIndex: number,
  sites: readonly number[],
  now: Date,
) {
  for (const [index, message] of messages.entries()) {
    const id = `${companyId}-report-${index + 1}`;
    const existing = await tx.feedback.findUnique({
      where: { id },
      select: { site: { select: { companyId: true } } },
    });
    if (existing) {
      if (existing.site.companyId !== companyId) {
        throw new Error("Demo report ID belongs to other data.");
      }
      continue;
    }
    const createdAt = new Date(now.getTime() - (index * 20 + companyIndex * 4) * 3600000);
    const siteId = sites[index % 2];
    const body = "[Demo] " + message.message;
    await tx.feedback.create({
      data: {
        id,
        siteId,
        submissionId: id,
        fingerprint: createHash("sha256").update(body).digest("hex"),
        type: message.type,
        message: body,
        email: index % 3 === 0 ? `visitor-${index + 1}@${company.slug}.example.test` : null,
        pageUrl: `https://${company.slug}-${index % 2 ? "portal" : "website"}.example.test/${["checkout", "search", "account", "details"][index % 4]}`,
        status: statuses[index % 4],
        createdAt,
      },
    });
    const period = createdAt.toISOString().slice(0, 7);
    await tx.reportUsagePeriod.upsert({
      where: { companyId_period: { companyId, period } },
      create: { companyId, period, count: 1 },
      update: { count: { increment: 1 } },
    });
  }
}

async function seedNotes(tx: Prisma.TransactionClient, companyId: string, ownerId: string) {
  for (let index = 0; index < 3; index++) {
    await tx.internalNote.upsert({
      where: { id: `${companyId}-note-${index}` },
      create: {
        id: `${companyId}-note-${index}`,
        feedbackId: `${companyId}-report-${index + 1}`,
        authorId: ownerId,
        body: [
          "[Demo] Reproduced on mobile. Review with the product team.",
          "[Demo] Added to the next planning discussion.",
          "[Demo] Resolution checked; keep this report for reference.",
        ][index],
      },
      update: {},
    });
  }
}

async function seedAudit(
  tx: Prisma.TransactionClient,
  company: DemoCompany,
  companyId: string,
  companyIndex: number,
  ownerId: string,
  now: Date,
) {
  for (const action of [
    "COMPANY_LIMITS_CHANGED",
    company.slug === "harbor" ? "COMPANY_SUSPENDED" : "COMPANY_REACTIVATED",
  ]) {
    const id = `${companyId}-audit-${action}`;
    if (!(await tx.auditEvent.findUnique({ where: { id } }))) {
      await tx.auditEvent.create({
        data: {
          id,
          actorId: ownerId,
          actorSnapshot: ownerId,
          companyId,
          action,
          resourceId: companyId,
          metadata: {
            reason: "[Demo] Illustrative administrative event seeded for dashboard preview",
          },
          createdAt: new Date(now.getTime() - (companyIndex * 6 + 1) * 3600000),
        },
      });
    }
  }
}

export async function seedDemoData(db: PrismaClient, ownerId: string, now: Date) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(178240)`;
      const owner = await tx.user.findUnique({
        where: { id: ownerId },
        select: { platformRole: true, emailVerified: true },
      });
      if (owner?.platformRole !== "PLATFORM_OWNER" || !owner.emailVerified) {
        throw new Error("A verified Platform Owner is required for demo seed.");
      }
      for (const [companyIndex, company] of companies.entries()) {
        const companyId = "heardesk-demo-" + company.slug;
        await seedCompany(tx, company, companyIndex, ownerId, now);
        await seedMembers(tx, company, companyId, now);
        const sites = await seedWebsites(tx, company, companyId);
        await seedReports(tx, company, companyId, companyIndex, sites, now);
        await seedNotes(tx, companyId, ownerId);
        await seedAudit(tx, company, companyId, companyIndex, ownerId, now);
      }
      return { companies: 4, websites: 8, users: 12, reports: 48, notes: 12, auditEvents: 8 };
    },
    { timeout: 60000 },
  );
}
