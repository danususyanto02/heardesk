import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { validateTestDatabaseUrls } from "../../scripts/test-config";

export async function companyDatabase() {
  validateTestDatabaseUrls(process.env.DATABASE_URL, process.env.MIGRATION_DATABASE_URL);
  if (process.env.INTEGRATION_TESTS !== "true") throw new Error("Isolated runner required.");
  const schema = "heardesk_company_" + randomUUID().replaceAll("-", "");
  const operator = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
  const client = await operator.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"; SET search_path TO "${schema}"`);
    for (const migration of ["202610050001_initial", "202610050002_singletons", "202610050003_companies"]) {
      await client.query(await readFile(path.resolve("prisma/migrations", migration, "migration.sql"), "utf8"));
    }
    const role = '"' + decodeURIComponent(new URL(process.env.DATABASE_URL!).username).replaceAll('"', '""') + '"';
    await client.query(`GRANT USAGE ON SCHEMA "${schema}" TO ${role}; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schema}" TO ${role}; GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "${schema}" TO ${role}`);
  } catch (error) { await operator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await operator.end(); throw error; }
  finally { client.release(); }
  const runtime = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });
  const db = new PrismaClient({ adapter: new PrismaPg(runtime, { schema }) });
  return { db, schema, async close() { await db.$disconnect(); await runtime.end(); await operator.query(`DROP SCHEMA "${schema}" CASCADE`); await operator.end(); } };
}
export async function seedCompanies(db: PrismaClient) {
  for (const id of ["alice", "bob", "viewer", "agent", "admin", "platform"]) await db.user.create({ data: { id, name: id, email: `${id}@example.test`, emailVerified: true, platformRole: id === "platform" ? "PLATFORM_OWNER" : "USER" } });
  for (const id of ["x", "y"]) await db.organization.create({ data: { id, name: id, slug: id, profile: { create: {} }, limits: { create: { websiteLimit: 10, seatLimit: 10, monthlyReportLimit: 100, storageBytesLimit: 100000000n } }, usage: { create: {} } } });
  for (const [userId, role, organizationId] of [["alice", "OWNER", "x"], ["bob", "OWNER", "y"], ["viewer", "VIEWER", "x"], ["agent", "AGENT", "x"], ["admin", "ADMIN", "x"]]) await db.member.create({ data: { id: `${userId}-member`, userId, role, organizationId } });
}
