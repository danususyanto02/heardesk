import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { validateTestDatabaseUrls } from "../../scripts/test-config";

test("Company API and legacy routes reject foreign reports, notes, attachments and platform-only access", async ({
  browser,
}) => {
  const values = parse(readFileSync(".env.test"));
  validateTestDatabaseUrls(values.DATABASE_URL, values.MIGRATION_DATABASE_URL);
  const pool = new pg.Pool({ connectionString: values.DATABASE_URL });
  const password = "Company-test-password-2026!";
  const now = new Date();
  const user = randomUUID();
  const company = randomUUID();
  const userEmail = `${user}@example.test`;
  const key = randomUUID();
  let report: string;
  let attachment: string;
  try {
    await pool.query(
      'INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,true,$4,$4)',
      [user, "Company Y Owner", userEmail, now],
    );
    await pool.query(
      'INSERT INTO account (id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES ($1,$2,$3,$2,$4,$5,$5)',
      [randomUUID(), user, "credential", await hashPassword(password), now],
    );
    await pool.query("INSERT INTO organization (id,name,slug) VALUES ($1,$2,$1)", [
      company,
      "Company Y",
    ]);
    await pool.query('INSERT INTO "CompanyProfile" ("organizationId","updatedAt") VALUES ($1,$2)', [
      company,
      now,
    ]);
    await pool.query(
      'INSERT INTO member (id,"organizationId","userId",role) VALUES ($1,$2,$3,$4)',
      [randomUUID(), company, user, "OWNER"],
    );
    await pool.query(
      'INSERT INTO "CompanyLimits" ("companyId","websiteLimit","seatLimit","monthlyReportLimit","storageBytesLimit") VALUES ($1,10,10,100,100000000)',
      [company],
    );
    await pool.query('INSERT INTO "CompanyUsage" ("companyId") VALUES ($1)', [company]);
    const site = (
      await pool.query(
        'INSERT INTO "Site" ("companyId",name,origin,"publicKey","updatedAt") VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [company, "Y", "http://localhost:3200", key, now],
      )
    ).rows[0];
    report = randomUUID();
    attachment = randomUUID();
    await pool.query(
      'INSERT INTO "Feedback" (id,"siteId","submissionId",fingerprint,type,message,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [report, site.id, randomUUID(), "hash", "ISSUE", "Y private report", now],
    );
    await pool.query(
      'INSERT INTO "Attachment" (id,"feedbackId",key,filename,mime,size) VALUES ($1,$2,$3,$4,$5,5)',
      [attachment, report, "foreign-test.webp", "screenshot.webp", "image/webp"],
    );
  } finally {
    await pool.end();
  }

  const x = await browser.newContext({ storageState: "test-results/admin-state.json" });
  const y = await browser.newContext();
  try {
    const origin = "http://localhost:3100";
    const xSite = await (await x.request.get(origin + "/api/admin/site")).json();
    expect(
      (await x.request.get(`${origin}/api/companies/${xSite.companyId}/feedback`)).status(),
    ).toBe(200);
    for (const endpoint of [
      `/api/companies/${company}/feedback`,
      `/api/companies/${xSite.companyId}/feedback/${report!}`,
      `/api/companies/${xSite.companyId}/attachments/${attachment!}`,
      `/api/admin/feedback/${report!}`,
      `/api/admin/attachments/${attachment!}`,
    ]) {
      expect((await x.request.get(origin + endpoint)).status()).toBe(404);
    }
    expect(
      (
        await x.request.patch(`${origin}/api/companies/${xSite.companyId}/feedback/${report!}`, {
          headers: { Origin: origin },
          data: { status: "DONE" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await x.request.post(
          `${origin}/api/companies/${xSite.companyId}/feedback/${report!}/notes`,
          { headers: { Origin: origin }, data: { body: "unauthorized" } },
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await x.request.post(`${origin}/api/auth/organization/update-member-role`, {
          headers: { Origin: origin },
          data: { organizationId: company, role: "OWNER" },
        })
      ).status(),
    ).toBe(403);
    const login = await y.request.post(origin + "/api/auth/sign-in/email", {
      headers: { Origin: origin },
      data: { email: userEmail, password },
    });
    expect(login.status()).toBe(200);
    expect((await y.request.get(origin + "/api/platform/overview")).status()).toBe(403);
    expect((await y.request.get(origin + "/api/platform/companies")).status()).toBe(403);
    expect(
      (
        await y.request.patch(`${origin}/api/platform/companies/${company}`, {
          headers: { Origin: origin },
          data: {
            action: "status",
            status: "SUSPENDED",
            reason: "Client bypass",
            expectedUpdatedAt: new Date().toISOString(),
          },
        })
      ).status(),
    ).toBe(403);
    const detail = await y.request.get(`${origin}/api/companies/${company}/feedback/${report!}`);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).message).toBe("Y private report");
    expect(
      (await y.request.get(`${origin}/api/companies/${xSite.companyId}/feedback`)).status(),
    ).toBe(404);
    expect((await y.request.get(origin + "/api/admin/feedback")).status()).toBe(200);
    const yList = await (await y.request.get(origin + "/api/admin/feedback")).json();
    expect(yList.total).toBe(1);
    expect(yList.items[0].id).toBe(report!);
    const mutationPool = new pg.Pool({ connectionString: values.DATABASE_URL });
    try {
      await mutationPool.query("UPDATE member SET role='VIEWER' WHERE \"userId\"=$1", [user]);
      expect(
        (
          await y.request.patch(`${origin}/api/companies/${company}/feedback/${report!}`, {
            headers: { Origin: origin },
            data: { status: "DONE" },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await y.request.post(`${origin}/api/companies/${company}/feedback/${report!}/notes`, {
            headers: { Origin: origin },
            data: { body: "Viewer bypass" },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await y.request.post(`${origin}/api/companies/${company}/sites`, {
            headers: { Origin: origin },
            data: {
              name: "Blocked",
              origin: "https://blocked.test",
              buttonLabel: "Report",
              position: "left",
            },
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await y.request.patch(`${origin}/api/admin/feedback/${report!}`, {
            headers: { Origin: origin },
            data: { status: "DONE" },
          })
        ).status(),
      ).toBe(403);
      await mutationPool.query(
        'UPDATE "CompanyProfile" SET status=\'SUSPENDED\' WHERE "organizationId"=$1',
        [company],
      );
      expect((await y.request.get(`${origin}/api/companies/${company}/feedback`)).status()).toBe(
        403,
      );
      const frame = await y.request.get(
        `${origin}/widget/${key}?parentOrigin=http%3A%2F%2Flocalhost%3A3200`,
      );
      expect(frame.status()).toBe(404);
      expect(frame.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
      await mutationPool.query(
        'UPDATE "CompanyProfile" SET status=\'ACTIVE\' WHERE "organizationId"=$1',
        [company],
      );
      await mutationPool.query('DELETE FROM member WHERE "userId"=$1', [user]);
      expect((await y.request.get(`${origin}/api/companies/${company}/feedback`)).status()).toBe(
        404,
      );
      await mutationPool.query('DELETE FROM session WHERE "userId"=$1', [user]);
      expect((await y.request.get(`${origin}/api/companies/${company}/feedback`)).status()).toBe(
        401,
      );
    } finally {
      await mutationPool.end();
    }
  } finally {
    await x.close();
    await y.close();
  }
});
