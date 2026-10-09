import { afterAll, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { validateTestDatabaseUrls } from "../../scripts/test-config";

validateTestDatabaseUrls(process.env.DATABASE_URL, process.env.MIGRATION_DATABASE_URL);
if (process.env.INTEGRATION_TESTS !== "true") {
  throw new Error("Isolated runner required.");
}
const pool = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
const schemas: string[] = [];
afterAll(async () => {
  for (const schema of schemas) {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
  await pool.end();
});
async function fixture(populated: boolean) {
  const schema = "heardesk_migration_" + randomUUID().replaceAll("-", "");
  schemas.push(schema);
  const client = await pool.connect();
  await client.query(`CREATE SCHEMA "${schema}"; SET search_path TO "${schema}"`);
  for (const name of ["202610050001_initial", "202610050002_singletons"]) {
    await client.query(
      await readFile(path.resolve("prisma/migrations", name, "migration.sql"), "utf8"),
    );
  }
  if (populated) {
    await client.query(`INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ('admin','Admin','admin@example.test',true,now(),now());
    INSERT INTO "Installation" (id,"adminId") VALUES (1,'admin');
    INSERT INTO "Site" (id,name,origin,"publicKey","updatedAt") VALUES (1,'Legacy','http://localhost:3200','preserved-key',now());
    INSERT INTO "Feedback" (id,"siteId","submissionId",fingerprint,type,message,"updatedAt") VALUES ('report',1,'submission','hash','ISSUE','Preserve this report',now());
    INSERT INTO "Attachment" (id,"feedbackId",key,filename,mime,size) VALUES ('attachment','report','preserved-file.webp','screenshot.webp','image/webp',123);
    INSERT INTO "InternalNote" (id,"feedbackId","authorId",body) VALUES ('note','report','admin','Preserve note');
    INSERT INTO "StorageBudget" (id,used) VALUES (1,123);
    INSERT INTO "UploadReservation" (id,bytes) VALUES ('pending',10485760);`);
  }
  return client;
}
async function migrate(client: pg.PoolClient) {
  const sql = await readFile(
    path.resolve("prisma/migrations/202610050003_companies/migration.sql"),
    "utf8",
  );
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
it("preserves legacy data and keys and unlocks multiple users/sites", async () => {
  const client = await fixture(true);
  try {
    await migrate(client);
    const user = (await client.query('SELECT "platformRole" FROM "user" WHERE id = $1', ["admin"]))
      .rows[0];
    expect(user.platformRole).toBe("PLATFORM_OWNER");
    const site = (await client.query('SELECT * FROM "Site" WHERE id=1')).rows[0];
    expect(site.publicKey).toBe("preserved-key");
    expect(site.companyId).toBeTruthy();
    expect(
      (await client.query('SELECT role FROM member WHERE "userId"=$1', ["admin"])).rows[0].role,
    ).toBe("OWNER");
    expect(
      (await client.query('SELECT "storedBytes" FROM "CompanyUsage"')).rows[0].storedBytes,
    ).toBe("123");
    expect(
      (await client.query('SELECT "companyId" FROM "UploadReservation"')).rows[0].companyId,
    ).toBe(site.companyId);
    expect((await client.query('SELECT message FROM "Feedback"')).rows[0].message).toBe(
      "Preserve this report",
    );
    expect((await client.query('SELECT body FROM "InternalNote"')).rows[0].body).toBe(
      "Preserve note",
    );
    expect((await client.query('SELECT key FROM "Attachment"')).rows[0].key).toBe(
      "preserved-file.webp",
    );
    await client.query(
      `INSERT INTO "user" (id,name,email,"createdAt","updatedAt") VALUES ('second','Second','second@example.test',now(),now())`,
    );
    const second = await client.query(
      'INSERT INTO "Site" ("companyId",name,origin,"publicKey","updatedAt") VALUES ($1,$2,$3,$4,now()) RETURNING id',
      [site.companyId, "Second", "https://second.test", "second-key"],
    );
    expect(second.rows[0].id).toBeGreaterThan(1);
    await expect(
      client.query(
        'INSERT INTO "CompanyLimits" ("companyId","websiteLimit","seatLimit","monthlyReportLimit","storageBytesLimit") VALUES ($1,-1,1,1,1)',
        ["nonexistent"],
      ),
    ).rejects.toThrow();
  } finally {
    client.release();
  }
});
it("empty installation gets no fabricated Company and retains bootstrap singletons", async () => {
  const client = await fixture(false);
  try {
    await migrate(client);
    expect((await client.query("SELECT count(*) FROM organization")).rows[0].count).toBe("0");
    await expect(
      client.query('INSERT INTO "StorageBudget" (id,used) VALUES (2,0)'),
    ).rejects.toThrow();
    const nullable = (
      await client.query(
        "SELECT is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='Site' AND column_name='companyId'",
      )
    ).rows[0];
    expect(nullable.is_nullable).toBe("NO");
  } finally {
    client.release();
  }
});
it("aborts orphan website migration without assigning guessed ownership", async () => {
  const client = await fixture(false);
  try {
    await client.query(
      `INSERT INTO "Site" (id,name,origin,"publicKey","updatedAt") VALUES (1,'Orphan','https://orphan.test','key',now())`,
    );
    await expect(migrate(client)).rejects.toThrow(/installation|owner/i);
    expect((await client.query('SELECT count(*) FROM "Site"')).rows[0].count).toBe("1");
    expect(
      (
        await client.query(
          "SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='user' AND column_name='platformRole'",
        )
      ).rows[0].count,
    ).toBe("0");
  } finally {
    client.release();
  }
});
