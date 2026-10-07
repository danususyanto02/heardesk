import { legacyCompanyContext } from "@/server/company-context";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { statusInput } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { const { actor, companyId, services } = await legacyCompanyContext(request.headers); const { id } = await context.params; return json(await services.getFeedback(actor, companyId, id)); } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try { assertOrigin(request); const { actor, companyId, services } = await legacyCompanyContext(request.headers); const { id } = await context.params, data = statusInput.parse(await readJson(request)); return json(await services.changeStatus(actor, companyId, id, data.status)); } catch (error) { return failure(error); }
}
