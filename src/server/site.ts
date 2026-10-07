import { randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./http";
import { connectSiteInput, rotateKeyInput, siteInput } from "@/lib/validation";
import { requireActor } from "./auth";
import { companyDefaults } from "./company-defaults";
import { createCompanyServices } from "./composition/company-services";
import { cookies } from "next/headers";

export async function defaultSite(requestHeaders?: Headers) {
  const actor = await requireActor(requestHeaders);
  const selected = requestHeaders?.get("x-heardesk-company") ?? (await cookies()).get("heardesk-company")?.value;
  const membership = await db.member.findFirst({ where: { userId: actor.userId, ...(selected ? { organizationId: selected } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  if (!membership) return null;
  const sites = await createCompanyServices(db).listWebsites(actor, membership.organizationId);
  return sites[0] ?? null;
}
export async function connectSite(input: unknown, requestHeaders?: Headers) {
  const { address } = connectSiteInput.parse(input);
  const actor = await requireActor(requestHeaders);
  if (!actor.emailVerified) throw new HttpError(403, "Verify your email first.");
  const selected = requestHeaders?.get("x-heardesk-company") ?? (await cookies()).get("heardesk-company")?.value;
  let member = await db.member.findFirst({ where: { userId: actor.userId, ...(selected ? { organizationId: selected } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  if (selected && !member) throw new HttpError(404, "Company not found.");
  if (!member) {
    const limits = companyDefaults();
    member = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(178233)`;
      const found = await tx.member.findFirst({ where: { userId: actor.userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      if (found) return found;
      const install = await tx.installation.findUnique({ where: { id: 1 } });
      if (install?.adminId !== actor.userId) throw new HttpError(403, "Company onboarding required.");
      const id = randomUUID();
      await tx.organization.create({ data: { id, name: "My Company", slug: "company-" + id, profile: { create: {} }, limits: { create: limits }, usage: { create: {} } } });
      return tx.member.create({ data: { id: randomUUID(), userId: actor.userId, organizationId: id, role: "OWNER" } });
    });
  }
  return createCompanyServices(db).createWebsite(actor, member.organizationId, { name: new URL(address).host, origin: address, buttonLabel: "Beri masukan", position: "right" });
}
export async function updateSite(input: unknown, requestHeaders?: Headers) {
  const site = await defaultSite(requestHeaders);
  if (!site) throw new HttpError(409, "Hubungkan website terlebih dahulu.");
  const actor = await requireActor(requestHeaders);
  return createCompanyServices(db).updateWebsite(actor, site.companyId, site.id, siteInput.parse(input));
}
export async function rotateWidgetKey(input: unknown, requestHeaders?: Headers) {
  const { expectedKey } = rotateKeyInput.parse(input), site = await defaultSite(requestHeaders);
  if (!site) throw new HttpError(409, "Hubungkan website terlebih dahulu.");
  return createCompanyServices(db).rotateKey(await requireActor(requestHeaders), site.companyId, site.id, expectedKey, randomBytes(24).toString("base64url"));
}
