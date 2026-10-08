import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDemoData } from "./demo-data";
import { createPlatformServices } from "../src/server/composition/platform-services";
import { enableDemoLogin } from "./demo-login";

const values = parse(await readFile(".env", "utf8"));
const target = new URL(values.DATABASE_URL);
if (target.pathname !== "/ureport" || ["host", "port", "database", "dbname", "options"].some(key => target.searchParams.has(key))) throw new Error("Demo seed requires the intended ureport application database.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: values.DATABASE_URL }) });
try {
  const installation = await db.installation.findUniqueOrThrow({ where: { id: 1 }, select: { adminId: true } });
  if (process.argv.includes("--enable-login")) {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(values.APP_URL).hostname)) throw new Error("Demo login provisioning is for local development only.");
    const password = process.env.HEARDESK_DEMO_PASSWORD;
    if (!password) throw new Error("HEARDESK_DEMO_PASSWORD is required; no default password is stored in source.");
    const result = await enableDemoLogin(db, installation.adminId, password);
    console.log(JSON.stringify({ ...result, passwordPrinted: false }));
    if (result.created) {
      const response = await fetch(values.APP_URL.replace(/\/$/, "") + "/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", Origin: values.APP_URL }, body: JSON.stringify({ email: result.email, password }) });
      if (!response.ok) throw new Error("Demo login HTTP verification failed with status " + response.status);
      const raw = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
      const cookie = raw.map(value => value.split(";")[0]).filter(Boolean).join("; ");
      const origin = values.APP_URL.replace(/\/$/, "");
      const companies = await fetch(origin + "/api/companies", { headers: { Cookie: cookie } });
      if (!companies.ok) throw new Error("Demo Company access verification failed.");
      const list = await companies.json();
      if (list.length !== 1 || list[0].id !== "heardesk-demo-northstar" || list[0].role !== "ADMIN") throw new Error("Unexpected demo Company access.");
      const platform = await fetch(origin + "/api/platform/overview", { headers: { Cookie: cookie } });
      if (platform.status !== 403) throw new Error("Demo identity obtained unexpected platform access.");
      await fetch(origin + "/api/auth/sign-out", { method: "POST", headers: { Cookie: cookie, Origin: values.APP_URL, "content-type": "application/json" }, body: "{}" });
      console.log("Verified: demo login 200, Northstar Company Admin access, platform API denied 403.");
    }
  } else if (process.argv.includes("--verify")) {
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
