import { randomBytes, randomUUID, createHash } from "node:crypto";
import { config } from "dotenv";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  demoAccounts,
  demoCompanyId,
  demoSeed,
} from "../src/modules/identity/domain/demo-accounts";
import { publicDemoConfig } from "../src/modules/identity/infrastructure/demo-config";

config({ quiet: true });
const settings = publicDemoConfig(process.env);
if (!settings) {
  throw new Error(
    "Set HEARDESK_DEMO_ACCOUNTS=true and HEARDESK_DEMO_PASSWORD with 15 to 128 characters. This password will be public on the login page.",
  );
}
if (process.env.HEARDESK_DEMO_PROVISION_APPROVED !== "true") {
  throw new Error(
    "Set HEARDESK_DEMO_PROVISION_APPROVED=true after reviewing the target database and taking a backup.",
  );
}
if (process.env.HEARDESK_DEMO_PLATFORM_OWNER === "true" && !settings.platformOwner) {
  throw new Error("Public Platform Owner access requires HEARDESK_DEMO_ONLY=true.");
}
const target = new URL(process.env.DATABASE_URL ?? "");
if (
  !["postgres:", "postgresql:"].includes(target.protocol) ||
  target.pathname !== "/ureport" ||
  ["host", "port", "database", "dbname", "options"].some((key) => target.searchParams.has(key))
) {
  throw new Error("Portfolio demo provisioning requires the intended ureport database.");
}
const origin = new URL(process.env.APP_URL ?? "");
if (
  !["http:", "https:"].includes(origin.protocol) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
) {
  throw new Error("APP_URL must be the intended application origin.");
}
const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
if (!local && process.env.HEARDESK_DEMO_PUBLIC_APPROVED !== "true") {
  throw new Error("Public demo provisioning also requires HEARDESK_DEMO_PUBLIC_APPROVED=true.");
}
if (!local && origin.protocol !== "https:") {
  throw new Error("Public demo accounts require an HTTPS application origin.");
}

const passwordHash = await hashPassword(settings.password);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const result = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(178240)`;
      const installation = await tx.installation.findUniqueOrThrow({
        where: { id: 1 },
        select: { adminId: true },
      });
      const operator = await tx.user.findUniqueOrThrow({ where: { id: installation.adminId } });
      if (
        operator.platformRole !== "PLATFORM_OWNER" ||
        !operator.emailVerified ||
        operator.accountStatus !== "ACTIVE" ||
        demoAccounts.some(
          (account) => account.id === operator.id || account.email === operator.email,
        )
      ) {
        throw new Error("A separate, active and verified installation administrator is required.");
      }
      let company = await tx.organization.findUnique({ where: { id: demoCompanyId } });
      if (company) {
        try {
          if (JSON.parse(company.metadata ?? "null")?.seed !== demoSeed) {
            throw new Error("Unmanaged dataset.");
          }
        } catch {
          throw new Error("Demo Company ID belongs to other data. Nothing was changed.");
        }
      } else {
        company = await tx.organization.create({
          data: {
            id: demoCompanyId,
            name: "HearDesk Portfolio (Demo)",
            slug: demoCompanyId,
            metadata: JSON.stringify({ seed: demoSeed, illustrative: true }),
          },
        });
      }
      const profile = await tx.companyProfile.upsert({
        where: { organizationId: demoCompanyId },
        create: { organizationId: demoCompanyId, status: "ACTIVE" },
        update: {},
      });
      if (profile.status !== "ACTIVE") {
        throw new Error("Demo Company is suspended. Provisioning does not reactivate it.");
      }
      await tx.companyLimits.upsert({
        where: { companyId: demoCompanyId },
        create: {
          companyId: demoCompanyId,
          websiteLimit: 2,
          seatLimit: 5,
          monthlyReportLimit: 500,
          storageBytesLimit: 268435456n,
        },
        update: {},
      });
      await tx.companyUsage.upsert({
        where: { companyId: demoCompanyId },
        create: { companyId: demoCompanyId, storedBytes: 0n },
        update: {},
      });
      const definitions = demoAccounts.filter(
        (account) => account.platformRole !== "PLATFORM_OWNER" || settings.platformOwner,
      );
      let accountsCreated = 0;
      const verifiedHashes = new Set<string>();
      for (const account of definitions) {
        let user = await tx.user.findFirst({
          where: { OR: [{ id: account.id }, { email: account.email }] },
        });
        if (user) {
          if (
            user.id !== account.id ||
            user.email !== account.email ||
            user.platformRole !== account.platformRole ||
            !user.emailVerified ||
            user.accountStatus !== "ACTIVE"
          ) {
            throw new Error(
              "Demo identity differs from the expected account. Nothing was changed.",
            );
          }
        } else {
          user = await tx.user.create({
            data: {
              id: account.id,
              name: account.label + " (Portfolio Demo)",
              email: account.email,
              emailVerified: true,
              platformRole: account.platformRole,
            },
          });
        }
        const memberships = await tx.member.findMany({ where: { userId: user.id } });
        if (memberships.length) {
          if (
            memberships.length !== 1 ||
            memberships[0].organizationId !== demoCompanyId ||
            memberships[0].role !== account.companyRole
          ) {
            throw new Error("Demo account has unexpected Company access. Nothing was changed.");
          }
        } else {
          await tx.member.create({
            data: {
              id: account.id + "-membership",
              organizationId: demoCompanyId,
              userId: user.id,
              role: account.companyRole,
            },
          });
        }
        const credentials = await tx.account.findMany({
          where: { userId: user.id, providerId: "credential" },
        });
        const credential = credentials[0];
        if (credential) {
          if (
            credentials.length !== 1 ||
            credential.id !== account.id + "-credential" ||
            credential.accountId !== user.id ||
            !credential.password
          ) {
            throw new Error(
              "Demo credential differs from the managed account. Nothing was changed.",
            );
          }
          if (!verifiedHashes.has(credential.password)) {
            if (
              !(await verifyPassword({ hash: credential.password, password: settings.password }))
            ) {
              throw new Error(
                "Existing demo password differs. Provisioning never resets passwords.",
              );
            }
            verifiedHashes.add(credential.password);
          }
        } else {
          await tx.account.create({
            data: {
              id: account.id + "-credential",
              userId: user.id,
              accountId: user.id,
              providerId: "credential",
              password: passwordHash,
            },
          });
          accountsCreated++;
        }
      }
      const siteOrigin = "https://portfolio-demo.example.test";
      const website = await tx.site.upsert({
        where: { companyId_origin: { companyId: demoCompanyId, origin: siteOrigin } },
        create: {
          companyId: demoCompanyId,
          name: "Portfolio website (Demo)",
          origin: siteOrigin,
          publicKey: randomBytes(24).toString("base64url"),
          buttonLabel: "Send feedback",
        },
        update: {},
      });
      const reports = [
        {
          type: "ISSUE",
          status: "NEW",
          message: "[Demo] The contact button does not respond on mobile.",
        },
        {
          type: "SUGGESTION",
          status: "REVIEWING",
          message: "[Demo] Please add a search field to the help page.",
        },
        {
          type: "COMPLIMENT",
          status: "DONE",
          message: "[Demo] The booking instructions were easy to follow.",
        },
      ] as const;
      const now = new Date();
      for (const [index, report] of reports.entries()) {
        const id = demoCompanyId + "-report-" + (index + 1);
        const existing = await tx.feedback.findUnique({ where: { id }, select: { siteId: true } });
        if (existing) {
          if (existing.siteId !== website.id) {
            throw new Error("Demo report ID belongs to other data. Nothing was changed.");
          }
          continue;
        }
        await tx.feedback.create({
          data: {
            id,
            siteId: website.id,
            submissionId: id,
            fingerprint: createHash("sha256").update(report.message).digest("hex"),
            ...report,
            pageUrl: siteOrigin + "/help",
            createdAt: now,
          },
        });
        const period = now.toISOString().slice(0, 7);
        await tx.reportUsagePeriod.upsert({
          where: { companyId_period: { companyId: demoCompanyId, period } },
          create: { companyId: demoCompanyId, period, count: 1 },
          update: { count: { increment: 1 } },
        });
      }
      if (accountsCreated) {
        await tx.auditEvent.create({
          data: {
            id: randomUUID(),
            actorId: operator.id,
            actorSnapshot: operator.id,
            companyId: demoCompanyId,
            action: "PORTFOLIO_DEMO_ACCOUNTS_PROVISIONED",
            resourceId: demoCompanyId,
            metadata: { accountsCreated, publicPlatformOwner: settings.platformOwner },
          },
        });
      }
      return {
        company: company.name,
        accountsCreated,
        accounts: definitions.map(({ label, email }) => ({ role: label, email })),
        publicPlatformOwner: settings.platformOwner,
        passwordPrinted: false,
      };
    },
    { timeout: 60000 },
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.$disconnect();
}
