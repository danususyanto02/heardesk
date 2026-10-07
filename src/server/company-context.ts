import { db } from "./db";
import { requireActor } from "./auth";
import { HttpError } from "./http";
import { createCompanyServices } from "./composition/company-services";
import { cookies } from "next/headers";

export async function legacyCompanyContext(headers?: Headers) {
  const actor = await requireActor(headers);
  const selected = headers?.get("x-heardesk-company") ?? (await cookies()).get("heardesk-company")?.value;
  const membership = await db.member.findFirst({ where: { userId: actor.userId, ...(selected ? { organizationId: selected } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  if (!membership) throw new HttpError(403, "Company membership required.", "COMPANY_NOT_FOUND");
  return { actor, companyId: membership.organizationId, services: createCompanyServices(db) };
}
