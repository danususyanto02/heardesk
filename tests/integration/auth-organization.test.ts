import { afterAll, beforeAll, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createOrganizationBoundary } from "@/modules/companies/infrastructure/auth-organization-policy";
import { companyOrganizationPlugin } from "@/modules/companies/infrastructure/auth-organization-plugin";
import { validateTestDatabaseUrls } from "../../scripts/test-config";

validateTestDatabaseUrls(process.env.DATABASE_URL, process.env.MIGRATION_DATABASE_URL);
if (process.env.INTEGRATION_TESTS !== "true") throw new Error("Isolated integration runner required.");
const schema = "heardesk_contract_" + randomUUID().replaceAll("-", "");
const operator = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
let runtime: pg.Pool;
let db: PrismaClient;

beforeAll(async () => {
  await operator.query(`CREATE SCHEMA "${schema}"`);
  await operator.query(`CREATE TABLE "${schema}".organization (id text PRIMARY KEY, name text NOT NULL, slug text UNIQUE NOT NULL, logo text, metadata text, "createdAt" timestamp NOT NULL);
    CREATE TABLE "${schema}".member (id text PRIMARY KEY, "organizationId" text NOT NULL, "userId" text NOT NULL, role text NOT NULL, "createdAt" timestamp NOT NULL, UNIQUE("organizationId","userId"));
    CREATE TABLE "${schema}".invitation (id text PRIMARY KEY, "organizationId" text NOT NULL, email text NOT NULL, role text, status text NOT NULL, "inviterId" text NOT NULL, "expiresAt" timestamp NOT NULL, "createdAt" timestamp NOT NULL);
    CREATE TABLE "${schema}"."user" (id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, "emailVerified" boolean NOT NULL, image text, "createdAt" timestamp NOT NULL, "updatedAt" timestamp NOT NULL, "platformRole" text NOT NULL DEFAULT 'USER', "accountStatus" text NOT NULL DEFAULT 'ACTIVE');
    CREATE TABLE "${schema}".session (id text PRIMARY KEY, "expiresAt" timestamp NOT NULL, token text UNIQUE NOT NULL, "createdAt" timestamp NOT NULL, "updatedAt" timestamp NOT NULL, "ipAddress" text, "userAgent" text, "userId" text NOT NULL, "activeOrganizationId" text);
    CREATE TABLE "${schema}".account (id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL, password text, "createdAt" timestamp NOT NULL, "updatedAt" timestamp NOT NULL);
    CREATE TABLE "${schema}".verification (id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamp NOT NULL, "createdAt" timestamp NOT NULL, "updatedAt" timestamp NOT NULL);`);
  const username = decodeURIComponent(new URL(process.env.DATABASE_URL!).username);
  const role = '"' + username.replaceAll('"', '""') + '"';
  await operator.query(`GRANT USAGE ON SCHEMA "${schema}" TO ${role}; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schema}" TO ${role}`);
  runtime = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` });
  db = new PrismaClient({ adapter: new PrismaPg(runtime, { schema }) });
});
afterAll(async () => {
  await db?.$disconnect();
  await runtime?.end();
  await operator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await operator.end();
});

function auth() {
  return betterAuth({ database: prismaAdapter(db, { provider: "postgresql" }), baseURL: "http://localhost:3100", secret: "test-only-not-a-production-secret-at-least-32-characters", emailAndPassword: { enabled: true, disableSignUp: true },
    user: { additionalFields: { platformRole: { type: ["USER", "PLATFORM_OWNER"], defaultValue: "USER", input: false } } },
    plugins: [companyOrganizationPlugin()], rateLimit: { enabled: false },
  });
}

it("uses installed organization schema names and enforces unique membership in PostgreSQL", async () => {
  const plugin = companyOrganizationPlugin();
  expect(plugin.schema).toHaveProperty("organization");
  expect(plugin.schema).toHaveProperty("member");
  expect(plugin.schema).toHaveProperty("invitation");
  await db.organization.create({ data: { id: "x", name: "X", slug: "x", createdAt: new Date() } });
  await db.member.create({ data: { id: "member-one", organizationId: "x", userId: "alice", role: "OWNER", createdAt: new Date() } });
  await expect(db.member.create({ data: { id: "member-two", organizationId: "x", userId: "alice", role: "VIEWER", createdAt: new Date() } })).rejects.toThrow();
});
it("public organization endpoints are denied before adapter mutations, including invite/owner bypasses", async () => {
  const handle = createOrganizationBoundary(auth().handler);
  for (const action of ["create", "remove-member", "update-member-role", "accept-invitation", "leave"]) {
    const result = await handle(new Request(`http://localhost:3100/api/auth/organization/${action}`, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100" }, body: JSON.stringify({ organizationId: "x", invitationId: "expired-or-wrong-email", role: "OWNER" }) }));
    expect(result.status).toBe(403);
  }
  expect(await db.organization.count()).toBe(1);
  expect(await db.member.count()).toBe(1);
});
it("server-side organization API is also denied by plugin guard", async () => {
  await expect(auth().api.createOrganization({ body: { name: "Bypass", slug: "bypass", userId: "alice" } })).rejects.toMatchObject({ status: "FORBIDDEN" });
  expect(await db.organization.count()).toBe(1);
});
it("disabled signup cannot inject a platform role", async () => {
  const result = await auth().handler(new Request("http://localhost:3100/api/auth/sign-up/email", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3100" }, body: JSON.stringify({ name: "Mallory", email: "mallory@example.test", password: "test-password-at-least-15", platformRole: "PLATFORM_OWNER", emailVerified: true }) }));
  expect(result.status).toBeGreaterThanOrEqual(400);
  expect(await db.user.count()).toBe(0);
});
