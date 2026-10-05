import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { attachmentBytes } from "@/server/storage";
import { failure, HttpError, privateHeaders } from "@/server/http";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(request.headers); const { id } = await params, item = await db.attachment.findUnique({ where: { id } }); if (!item) throw new HttpError(404, "Lampiran tidak ditemukan."); const bytes = await attachmentBytes(item.key); return new Response(new Uint8Array(bytes), { headers: { ...privateHeaders, "Content-Type": "image/webp", "Content-Disposition": 'inline; filename="screenshot.webp"' } }); } catch (error) { return failure(error); }
}
