import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { assertOrigin, failure, HttpError, json, readJson } from "@/server/http";
import { noteInput } from "@/lib/validation";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { assertOrigin(request); const admin = await requireAdmin(request.headers), { id } = await params, data = noteInput.parse(await readJson(request)); if (!await db.feedback.findUnique({ where: { id } })) throw new HttpError(404, "Feedback tidak ditemukan."); return json(await db.internalNote.create({ data: { feedbackId: id, authorId: admin.id, body: data.body }, select: { id: true, body: true, createdAt: true } }), 201); } catch (error) { return failure(error); }
}
