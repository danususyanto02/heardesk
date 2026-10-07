import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { noteInput } from "@/lib/validation";
export async function POST(request: Request, { params }: { params: Promise<{ companyId: string; feedbackId: string }> }) {
  try { assertOrigin(request); const { companyId, feedbackId } = await params, { actor, services } = await companyApi(request, companyId), input = noteInput.parse(await readJson(request)); return json(await services.addNote(actor, companyId, feedbackId, input.body), 201); } catch (error) { return failure(error); }
}
