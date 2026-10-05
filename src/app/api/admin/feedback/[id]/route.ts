import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { assertOrigin, failure, HttpError, json, readJson } from "@/server/http";
import { statusInput } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { await requireAdmin(request.headers); const { id } = await context.params; const item = await db.feedback.findUnique({ where: { id }, include: { attachment: { select: { id: true, filename: true, size: true } }, notes: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true } } } }); if (!item) throw new HttpError(404, "Feedback tidak ditemukan."); const { fingerprint: _, submissionId: __, ...safe } = item; return json(safe); } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try { assertOrigin(request); await requireAdmin(request.headers); const { id } = await context.params, data = statusInput.parse(await readJson(request)); if (!await db.feedback.findUnique({ where: { id } })) throw new HttpError(404, "Feedback tidak ditemukan."); return json(await db.feedback.update({ where: { id }, data, select: { id: true, status: true } })); } catch (error) { return failure(error); }
}
