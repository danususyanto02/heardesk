import type pg from "pg";

const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
export async function provisionRuntimeGrants(client: pg.PoolClient, runtimeRole: string, schema = "public"): Promise<void> {
  const role = quote(runtimeRole), prefix = quote(schema) + ".";
  for (const table of ["organization", "member", "invitation", "CompanyProfile", "CompanyLimits", "CompanyUsage", "ReportUsagePeriod", "ReportReservation", "CompanyCreationRequest"]) await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${prefix}${quote(table)} TO ${role}`);
  await client.query(`REVOKE UPDATE, DELETE, TRUNCATE ON TABLE ${prefix}"AuditEvent" FROM ${role}; GRANT SELECT, INSERT ON TABLE ${prefix}"AuditEvent" TO ${role}; GRANT USAGE, SELECT ON SEQUENCE ${prefix}"Site_id_seq" TO ${role}`);
}
