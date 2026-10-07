import { readFile, writeFile, mkdir, cp, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parse } from "dotenv";
import pg from "pg";
import { validateAttachmentBackup } from "./backup-validation";
import { provisionRuntimeGrants } from "./runtime-grants";

const action = process.argv[2];
const runtime = parse(await readFile(".env", "utf8"));
const migration = parse(await readFile(".env.migration", "utf8"));
const url = new URL(migration.MIGRATION_DATABASE_URL);
const appUrl = new URL(runtime.DATABASE_URL);
if (url.pathname !== "/ureport" || appUrl.pathname !== "/ureport" || url.hostname !== appUrl.hostname || url.port !== appUrl.port) throw new Error("Expected matching application database targets.");
const operator = new pg.Pool({ connectionString: migration.MIGRATION_DATABASE_URL });
const tables = ["user", "account", "Installation", "Site", "Feedback", "Attachment", "InternalNote", "StorageBudget"];
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
async function snapshot(pool: pg.Pool = operator) {
  const result: Record<string, { count: number; hash: string }> = {};
  for (const table of tables) {
    const rows = (await pool.query(`SELECT row_to_json(t)::text AS value FROM ${quote(table)} t ORDER BY id`)).rows.map(row => row.value);
    result[table] = { count: rows.length, hash: createHash("sha256").update(rows.join("\n")).digest("hex") };
  }
  return result;
}
async function fileHashes(root: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  async function walk(directory: string) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, item.name);
      if (item.isDirectory()) await walk(full);
      else if (item.isFile()) hashes[path.relative(root, full)] = createHash("sha256").update(await readFile(full)).digest("hex");
      else throw new Error("Unexpected storage symlink.");
    }
  }
  await walk(root); return hashes;
}
function toolEnvironment(connection: URL) {
  return { ...process.env, PGHOST: connection.hostname, PGPORT: connection.port || "5432", PGDATABASE: connection.pathname.slice(1), PGUSER: decodeURIComponent(connection.username), PGPASSWORD: decodeURIComponent(connection.password), PGSSLMODE: connection.searchParams.get("sslmode") ?? "prefer" };
}
try {
  if (action === "inspect") {
    const meta = (await operator.query("SELECT current_database() AS database, current_user AS role, current_setting('server_version') AS version")).rows[0];
    const applied = (await operator.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name')).rows;
    console.log(JSON.stringify({ ...meta, applied, snapshot: await snapshot() }, null, 2));
  } else if (action === "backup") {
    const bin = process.env.POSTGRES_BIN;
    if (!bin) throw new Error("POSTGRES_BIN required.");
    const directory = path.resolve("backups", "heardesk-" + new Date().toISOString().replaceAll(":", "-"));
    await mkdir(directory, { recursive: true });
    const before = await snapshot();
    const dump = spawnSync(path.join(bin, "pg_dump.exe"), ["--format=custom", "--no-owner", "--file", path.join(directory, "database.dump")], { env: toolEnvironment(url), encoding: "utf8" });
    if (dump.status !== 0) throw new Error("Database backup failed: " + dump.stderr.replaceAll(decodeURIComponent(url.password), "[redacted]"));
    const listing = spawnSync(path.join(bin, "pg_restore.exe"), ["--list", path.join(directory, "database.dump")], { encoding: "utf8" });
    if (listing.status !== 0) throw new Error("Backup archive cannot be read.");
    const storage = path.resolve(runtime.STORAGE_DIR || "storage");
    const attachments = (await operator.query('SELECT key,size FROM "Attachment"')).rows;
    try { await stat(storage); } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT") || attachments.length) throw error;
      await mkdir(storage, { recursive: true });
    }
    const hashes = await fileHashes(storage);
    await cp(storage, path.join(directory, "storage"), { recursive: true });
    const sizes = new Map<string, number>();
    for (const key of Object.keys(hashes)) sizes.set(key, (await stat(path.join(directory, "storage", key))).size);
    validateAttachmentBackup(attachments, sizes);
    if (JSON.stringify(hashes) !== JSON.stringify(await fileHashes(path.join(directory, "storage")))) throw new Error("Storage copy mismatch.");
    await writeFile(path.join(directory, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), database: "ureport", before, storage: hashes, dumpHash: createHash("sha256").update(await readFile(path.join(directory, "database.dump"))).digest("hex") }, null, 2));
    console.log(JSON.stringify({ backup: directory, archiveReadable: true, storageFiles: Object.keys(hashes).length, counts: Object.fromEntries(Object.entries(before).map(([key, value]) => [key, value.count])) }, null, 2));
  } else if (action === "restore-check") {
    const manifest = JSON.parse(await readFile(path.join(process.argv[3], "manifest.json"), "utf8"));
    const restored = new pg.Pool({ connectionString: "postgresql://heardesk_restore@127.0.0.1:55432/heardesk_restore" });
    try {
      const actual = await snapshot(restored);
      if (JSON.stringify(actual) !== JSON.stringify(manifest.before)) throw new Error("Restored database hashes differ from backup snapshot.");
      console.log("Restored database verified: all 8 legacy table hashes/counts match backup.");
    } finally { await restored.end(); }
  } else if (action === "local-email") {
    let text = await readFile(".env", "utf8");
    for (const [key, value] of Object.entries({ HEARDESK_EMAIL_MODE: "local", HEARDESK_EMAIL_DIR: "storage/mailbox", HEARDESK_LOCAL_SIGNUP: "true" })) {
      const line = `${key}="${value}"`;
      text = new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), line) : text.trimEnd() + "\n" + line + "\n";
    }
    await writeFile(".env", text);
    console.log("Local-only signup and email capture configured; remote hostname signup remains disabled.");
  } else if (action === "provision") {
    if (process.env.HEARDESK_MIGRATION_APPROVED !== "true") throw new Error("Approved rollout required.");
    const client = await operator.connect();
    try { await client.query("BEGIN"); await provisionRuntimeGrants(client, decodeURIComponent(appUrl.username)); await client.query("COMMIT"); console.log("Runtime schema privileges provisioned independently of Company creation."); }
    catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } else if (action === "configure") {
    if (process.env.HEARDESK_MIGRATION_APPROVED !== "true") throw new Error("Approved rollout required.");
    const client = await operator.connect();
    try {
      await client.query("BEGIN");
      const company = (await client.query('SELECT m."organizationId" FROM member m JOIN "Installation" i ON i."adminId"=m."userId" WHERE i.id=1 AND m.role=\'OWNER\'')).rows;
      if (company.length !== 1) throw new Error("Expected exactly one initial owner Company.");
      await client.query('UPDATE "CompanyLimits" SET "websiteLimit"=3,"seatLimit"=5,"monthlyReportLimit"=1000,"storageBytesLimit"=1073741824 WHERE "companyId"=$1', [company[0].organizationId]);
      await provisionRuntimeGrants(client, decodeURIComponent(appUrl.username));
      await client.query('INSERT INTO "AuditEvent" (id,"actorId","actorSnapshot","companyId",action,"resourceId",metadata) SELECT $1,i."adminId",i."adminId",$2,\'COMPANY_LIMITS_CHANGED\',$2,$3::jsonb FROM "Installation" i WHERE i.id=1', ["rollout-" + Date.now(), company[0].organizationId, JSON.stringify({ reason: "Owner-approved beta defaults: 3 websites, 5 seats, 1000 monthly reports, 1 GiB storage" })]);
      await client.query("COMMIT");
      let envText = await readFile(".env", "utf8");
      for (const [key, value] of Object.entries({ HEARDESK_DEFAULT_WEBSITES: "3", HEARDESK_DEFAULT_SEATS: "5", HEARDESK_DEFAULT_MONTHLY_REPORTS: "1000", HEARDESK_DEFAULT_STORAGE_BYTES: "1073741824" })) {
        const line = `${key}="${value}"`;
        envText = new RegExp(`^${key}=.*$`, "m").test(envText) ? envText.replace(new RegExp(`^${key}=.*$`, "m"), line) : envText.trimEnd() + "\n" + line + "\n";
      }
      await writeFile(".env", envText);
      const pool = new pg.Pool({ connectionString: runtime.DATABASE_URL });
      try { await pool.query('SELECT * FROM "CompanyLimits" LIMIT 1'); await pool.query('SELECT nextval(\'"Site_id_seq"\')'); } finally { await pool.end(); }
      console.log("Initial Company beta limits configured; runtime reads/sequence access verified.");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } else if (action === "smoke") {
    const pool = new pg.Pool({ connectionString: runtime.DATABASE_URL });
    try {
      const initial = (await pool.query('SELECT u."platformRole",m.role,s."publicKey",s.origin,l."websiteLimit",l."seatLimit",l."monthlyReportLimit",l."storageBytesLimit" FROM "Installation" i JOIN "user" u ON u.id=i."adminId" JOIN member m ON m."userId"=u.id JOIN "Site" s ON s."companyId"=m."organizationId" JOIN "CompanyLimits" l ON l."companyId"=m."organizationId" WHERE i.id=1')).rows;
      if (initial.length !== 1 || initial[0].platformRole !== "PLATFORM_OWNER" || initial[0].role !== "OWNER") throw new Error("Initial ownership invalid.");
      const row = initial[0];
      const root = runtime.APP_URL.replace(/\/$/, "");
      const widget = await fetch(`${root}/widget/${encodeURIComponent(row.publicKey)}?parentOrigin=${encodeURIComponent(row.origin)}`);
      if (!widget.ok || !widget.headers.get("content-security-policy")?.includes(row.origin)) throw new Error("Existing widget/CSP smoke failed.");
      if (!(await fetch(root + "/widget.js")).ok) throw new Error("Widget script failed.");
      if ((await fetch(root + "/api/admin/feedback")).status !== 401) throw new Error("Anonymous inbox access not rejected.");
      for (const table of ["organization", "member", "invitation", "CompanyProfile", "CompanyLimits", "CompanyUsage", "ReportUsagePeriod", "ReportReservation", "CompanyCreationRequest", "AuditEvent"]) await pool.query(`SELECT 1 FROM ${quote(table)} LIMIT 1`);
      const permissions = (await pool.query("SELECT has_table_privilege(current_user, '\"AuditEvent\"', 'INSERT') AS audit_insert, has_table_privilege(current_user, '\"AuditEvent\"', 'UPDATE') AS audit_update, has_table_privilege(current_user, '\"AuditEvent\"', 'DELETE') AS audit_delete, has_sequence_privilege(current_user, '\"Site_id_seq\"', 'USAGE') AS sequence_usage")).rows[0];
      if (!permissions.audit_insert || permissions.audit_update || permissions.audit_delete || !permissions.sequence_usage) throw new Error("Runtime audit/sequence privileges invalid.");
      console.log(JSON.stringify({ ownerRoleVerified: true, legacyWidgetStatus: widget.status, registeredOriginFraming: true, publicScript: 200, anonymousInbox: 401, companyLimits: { websites: row.websiteLimit, seats: row.seatLimit, monthlyReports: row.monthlyReportLimit, storageBytes: row.storageBytesLimit }, runtimePermissions: permissions }));
    } finally { await pool.end(); }
  } else if (action === "verify") {
    const manifest = JSON.parse(await readFile(path.join(process.argv[3], "manifest.json"), "utf8"));
    const counts = await snapshot();
    for (const table of ["account", "Installation", "Feedback", "Attachment", "InternalNote", "StorageBudget"]) if (JSON.stringify(counts[table]) !== JSON.stringify(manifest.before[table])) throw new Error(`Legacy data changed: ${table}`);
    const restored = new pg.Pool({ connectionString: "postgresql://heardesk_restore@127.0.0.1:55432/heardesk_restore" });
    try {
      for (const [table, columns] of [["Site", 'id,name,origin,"publicKey","buttonLabel",position,"createdAt","updatedAt"'], ["user", 'id,name,email,"emailVerified",image,"createdAt","updatedAt"']]) {
        const query = `SELECT ${columns} FROM ${quote(table)} ORDER BY id`;
        if (JSON.stringify((await operator.query(query)).rows) !== JSON.stringify((await restored.query(query)).rows)) throw new Error(`Legacy fields changed: ${table}`);
      }
    } finally { await restored.end(); }
    const site = (await operator.query('SELECT "publicKey", "companyId" FROM "Site" ORDER BY id')).rows;
    if (site.some(row => !row.companyId)) throw new Error("Website ownership missing.");
    const stored = await fileHashes(path.resolve(runtime.STORAGE_DIR || "storage"));
    if (JSON.stringify(stored) !== JSON.stringify(manifest.storage)) throw new Error("Storage changed during migration.");
    console.log(JSON.stringify({ preservedLegacyTables: 6, storageFiles: Object.keys(stored).length, sitesOwned: site.length, companyCount: Number((await operator.query('SELECT count(*) FROM organization')).rows[0].count) }));
  } else throw new Error("Use inspect, backup, configure, or verify.");
} finally { await operator.end(); }
