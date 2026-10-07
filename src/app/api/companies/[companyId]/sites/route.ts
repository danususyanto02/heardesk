import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { siteInput } from "@/lib/validation";
type Context = { params: Promise<{ companyId: string }> };
export async function GET(request: Request, { params }: Context) {
  try { const { companyId } = await params, { actor, services } = await companyApi(request, companyId); return json(await services.listWebsites(actor, companyId)); } catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: Context) {
  try { assertOrigin(request); const { companyId } = await params, { actor, services } = await companyApi(request, companyId), input = siteInput.parse(await readJson(request)); return json(await services.createWebsite(actor, companyId, input), 201); } catch (error) { return failure(error); }
}
