import { expect, it } from "vitest";
import pg from "pg";
import { companyDatabase } from "../support/company-database";
import { provisionRuntimeGrants } from "../../scripts/runtime-grants";

it("empty migrated schema denies runtime audit edits before Company/bootstrap creation", async () => {
  const fixture = await companyDatabase();
  const operator = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL });
  const client = await operator.connect();
  try {
    expect(await fixture.db.organization.count()).toBe(0);
    await provisionRuntimeGrants(
      client,
      decodeURIComponent(new URL(process.env.DATABASE_URL!).username),
      fixture.schema,
    );
    const rights = await fixture.db.$queryRaw<
      { insert: boolean; update: boolean; delete: boolean; truncate: boolean }[]
    >`SELECT has_table_privilege(current_user, ${fixture.schema + '."AuditEvent"'}, 'INSERT') AS insert, has_table_privilege(current_user, ${fixture.schema + '."AuditEvent"'}, 'UPDATE') AS update, has_table_privilege(current_user, ${fixture.schema + '."AuditEvent"'}, 'DELETE') AS delete, has_table_privilege(current_user, ${fixture.schema + '."AuditEvent"'}, 'TRUNCATE') AS truncate`;
    expect(rights[0]).toEqual({ insert: true, update: false, delete: false, truncate: false });
  } finally {
    client.release();
    await operator.end();
    await fixture.close();
  }
});
