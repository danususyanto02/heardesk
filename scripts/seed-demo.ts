import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDemoData } from "./demo-data";
import { createPlatformServices } from "../src/server/composition/platform-services";

const values = parse(await readFile(".env", "utf8"));
const target = new URL(values.DATABASE_URL);
if (target.pathname !== "/ureport" || ["host", "port", "database", "dbname", "options"].some(key => target.searchParams.has(key))) throw new Error("Demo seed requires the intended ureport application database.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: values.DATABASE_URL }) });
try {
  const installation = await db.installation.findUniqueOrThrow({ where: { id: 1 }, select: { adminId: true } });
  if (process.argv.includes("--verify")) {
    const owner = await db.user.findUniqueOrThrow({ where: { id: installation.adminId }, select: { id: true, emailVerified: true, platformRole: true } });
    const platform = createPlatformServices(db, { current: async () => ({ userId: owner.id, emailVerified: owner.emailVerified, platformRole: owner.platformRole }) });
    const result = await platform.companies({ q: "(Demo)", page: 1 });
    const reports = await db.feedback.count({ where: { site: { companyId: { startsWith: "heardesk-demo-" } } } });
    const notes = await db.internalNote.count({ where: { id: { startsWith: "heardesk-demo-" } } });
    const audit = await platform.audit({ q: "", page: 1 });
    if (result.total !== 4 || reports !== 48 || notes !== 12) throw new Error("Demo data verification failed.");
    console.log(JSON.stringify({ verified: true, overview: await platform.overview(), demoCompanies: result.items.map(company => ({ name: company.name, status: company.status, websites: company.websites, members: company.members, reports: company.reports, monthlyReports: company.monthlyReports })), reports, notes, auditEventsVisible: audit.total }, null, 2));
  } else {
    const result = await seedDemoData(db, installation.adminId, new Date());
    console.log(JSON.stringify({ dataset: "Illustrative demo, not real client activity", ...result, ownerAccess: "Existing Platform Owner is a member of all demo Companies", fakeLoginsCreated: false }, null, 2));
  }
} finally { await db.$disconnect(); }
