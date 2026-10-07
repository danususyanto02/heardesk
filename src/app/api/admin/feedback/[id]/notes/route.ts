import { legacyCompanyContext } from "@/server/company-context";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { noteInput } from "@/lib/validation";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { assertOrigin(request); const { actor, companyId, services } = await legacyCompanyContext(request.headers); const { id } = await params, data = noteInput.parse(await readJson(request)); return json(await services.addNote(actor, companyId, id, data.body), 201); } catch (error) { return failure(error); }
}
