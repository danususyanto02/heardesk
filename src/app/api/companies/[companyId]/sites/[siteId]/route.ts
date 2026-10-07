import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { siteInput } from "@/lib/validation";
import { z } from "zod";
type Context = { params: Promise<{ companyId: string; siteId: string }> };
export async function GET(request: Request, { params }: Context) {
  try { const { companyId, siteId } = await params, { actor, services } = await companyApi(request, companyId); return json(await services.getWebsite(actor, companyId, z.coerce.number().int().positive().parse(siteId))); } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try { assertOrigin(request); const { companyId, siteId } = await params, { actor, services } = await companyApi(request, companyId); return json(await services.updateWebsite(actor, companyId, z.coerce.number().int().positive().parse(siteId), siteInput.parse(await readJson(request)))); } catch (error) { return failure(error); }
}
