import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { statusInput } from "@/lib/validation";
type Context = { params: Promise<{ companyId: string; feedbackId: string }> };
export async function GET(request: Request, { params }: Context) {
  try { const { companyId, feedbackId } = await params, { actor, services } = await companyApi(request, companyId); return json(await services.getFeedback(actor, companyId, feedbackId)); } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try { assertOrigin(request); const { companyId, feedbackId } = await params, { actor, services } = await companyApi(request, companyId), input = statusInput.parse(await readJson(request)); return json(await services.changeStatus(actor, companyId, feedbackId, input.status)); } catch (error) { return failure(error); }
}
