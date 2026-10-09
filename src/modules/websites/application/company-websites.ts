import type { Actor } from "../../identity/domain/session";
import type { CompanyUnitOfWork } from "../../companies/domain/company-unit-of-work";
import { CompanyAccessError } from "../../companies/domain/access";
import type { Clock } from "../../usage/domain/usage";
import type { WebsiteRepository, WebsiteCreator, WebsiteInput } from "../domain/website-repository";
import type { AuditWriter } from "../../platform/domain/audit";

export function companyWebsites(
  uow: CompanyUnitOfWork<{ websites: WebsiteRepository & WebsiteCreator; audit: AuditWriter }>,
  clock: Clock,
) {
  return {
    createWebsite: (actor: Actor, companyId: string, input: WebsiteInput) =>
      uow.write(actor, companyId, "sites:manage", (scope, tx) => tx.websites.create(scope, input)),
    updateWebsite: (actor: Actor, companyId: string, id: number, input: WebsiteInput) =>
      uow.write(actor, companyId, "sites:manage", async (scope, tx) => {
        const result = await tx.websites.update(scope, id, input);
        if (!result) {
          throw new CompanyAccessError("RESOURCE_NOT_FOUND");
        }
        return result;
      }),
    listWebsites: (actor: Actor, companyId: string) =>
      uow.read(actor, companyId, "sites:read", (scope, tx) => tx.websites.list(scope)),
    getWebsite: (actor: Actor, companyId: string, id: number) =>
      uow.read(actor, companyId, "sites:read", async (scope, tx) => {
        const site = await tx.websites.find(scope, id);
        if (!site) {
          throw new CompanyAccessError("RESOURCE_NOT_FOUND");
        }
        return site;
      }),
    rotateKey: (actor: Actor, companyId: string, id: number, expectedKey: string, newKey: string) =>
      uow.write(actor, companyId, "sites:manage", async (scope, tx) => {
        const result = await tx.websites.rotate(scope, id, expectedKey, newKey);
        if (result.status === "not-found") {
          throw new CompanyAccessError("RESOURCE_NOT_FOUND");
        }
        if (result.status !== "rotated") {
          throw Object.assign(new Error("Website key changed"), { code: "STALE_KEY" });
        }
        await tx.audit.append({
          actorId: actor.userId,
          companyId,
          action: "WEBSITE_KEY_ROTATED",
          resourceId: String(id),
          createdAt: clock.now().toISOString(),
        });
        return result.website;
      }),
  };
}
