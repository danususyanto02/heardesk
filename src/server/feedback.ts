import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { feedbackInput } from "@/lib/validation";
import { db } from "./db";
import { boundedBytes, HttpError } from "./http";
import { stageAttachment, discardAttachment } from "./storage";
import { clientKey, rateLimit } from "./rate-limit";
export async function submitFeedback(request: Request) {
  await rateLimit("submit:" + clientKey(request), 5);
  await rateLimit("submit:global", 100);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new HttpError(415, "Gunakan formulir feedback.");
  const bytes = await boundedBytes(request, 6 * 1024 * 1024);
  let form: FormData;
  try { form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body: bytes }).formData(); } catch { throw new HttpError(400, "Formulir tidak valid."); }
  const allowed = ["siteKey", "submissionId", "type", "message", "email", "pageUrl", "screenshot"];
  for (const key of form.keys()) { if (!allowed.includes(key) || form.getAll(key).length !== 1) throw new HttpError(400, "Field formulir tidak valid."); }
  const data = feedbackInput.parse(Object.fromEntries(allowed.filter(key => key !== "screenshot").map(key => [key, form.get(key) ?? undefined])));
  const site = await db.site.findUnique({ where: { publicKey: data.siteKey } });
  if (!site) throw new HttpError(404, "Widget tidak ditemukan.");
  const file = form.get("screenshot");
  if (file && !(file instanceof File)) throw new HttpError(400, "Lampiran tidak valid.");
  if (file instanceof File && file.size > 5 * 1024 * 1024) throw new HttpError(413, "Screenshot maksimal 5 MiB.");
  const imageHash = file instanceof File && file.size ? createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex") : null;
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...data, imageHash })).digest("hex");
  const existing = await db.feedback.findUnique({ where: { siteId_submissionId: { siteId: site.id, submissionId: data.submissionId } } });
  if (existing) { if (existing.fingerprint !== fingerprint) throw new HttpError(409, "Isi pengiriman berubah. Kirim sebagai laporan baru."); return { duplicate: true }; }
  const staged = file instanceof File && file.size ? await stageAttachment(file) : null;
  let persisted = false;
  try {
    await db.$transaction(async tx => {
      await tx.feedback.create({ data: { siteId: site.id, submissionId: data.submissionId, fingerprint, type: data.type, message: data.message, email: data.email, pageUrl: data.pageUrl,
        attachment: staged ? { create: { key: staged.key, size: staged.size, mime: staged.mime, filename: staged.filename } } : undefined } });
      if (staged) { await tx.storageBudget.update({ where: { id: 1 }, data: { used: { increment: staged.size } } }); await tx.uploadReservation.delete({ where: { id: staged.id } }); }
    });
    persisted = true;
    return { duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const retry = await db.feedback.findUnique({ where: { siteId_submissionId: { siteId: site.id, submissionId: data.submissionId } } });
      if (retry?.fingerprint === fingerprint) return { duplicate: true };
      throw new HttpError(409, "Pengiriman yang sama memiliki isi berbeda.");
    }
    throw error;
  } finally { if (staged && !persisted) await discardAttachment(staged.id, staged.key); }
}
