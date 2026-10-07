import type { Prisma } from "@/generated/prisma/client";
import type { WebsiteDto, WebsiteRepository, WebsiteCreator } from "../domain/website-repository";
import { randomBytes } from "node:crypto";

export function websiteRepository(tx: Prisma.TransactionClient): WebsiteRepository & WebsiteCreator {
  const dto = (row: { id: number; companyId: string | null; name: string; origin: string; publicKey: string; buttonLabel: string; position: string }): WebsiteDto => {
    if (!row.companyId || !["left", "right"].includes(row.position)) throw new Error("Invalid migrated website");
    return { id: row.id, companyId: row.companyId, name: row.name, origin: row.origin, publicKey: row.publicKey, buttonLabel: row.buttonLabel, position: row.position as "left" | "right" };
  };
  return {
    async create(scope, input) {
      const limits = await tx.companyLimits.findUniqueOrThrow({ where: { companyId: scope.companyId } });
      if (await tx.site.count({ where: { companyId: scope.companyId } }) >= limits.websiteLimit) throw Object.assign(new Error("Company website allowance exhausted"), { code: "COMPANY_QUOTA_EXCEEDED" });
      return dto(await tx.site.create({ data: { ...input, companyId: scope.companyId, publicKey: randomBytes(24).toString("base64url") } }));
    },
    async list(scope) { return (await tx.site.findMany({ where: { companyId: scope.companyId }, orderBy: { id: "asc" } })).map(dto); },
    async find(scope, id) { const row = await tx.site.findFirst({ where: { id, companyId: scope.companyId } }); return row ? dto(row) : null; },
    async update(scope, id, input) { const result = await tx.site.updateMany({ where: { id, companyId: scope.companyId }, data: input }); return result.count ? dto(await tx.site.findUniqueOrThrow({ where: { id } })) : null; },
    async rotate(scope, id, expectedKey, newKey) {
      if (!await tx.site.findFirst({ where: { id, companyId: scope.companyId } })) return { status: "not-found" };
      const result = await tx.site.updateMany({ where: { id, companyId: scope.companyId, publicKey: expectedKey }, data: { publicKey: newKey } });
      return result.count ? { status: "rotated", website: dto(await tx.site.findUniqueOrThrow({ where: { id } })) } : { status: "stale" };
    },
  };
}
