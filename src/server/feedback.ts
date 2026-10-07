import { createHash } from "node:crypto";
import { reserveVisitorReport, releaseVisitorReservation, persistVisitorReport } from "@/modules/usage/infrastructure/prisma-visitor-usage";
import { feedbackInput } from "@/lib/validation";
import { db } from "./db";
import { boundedBytes, HttpError } from "./http";
import { stageAttachment, discardAttachment } from "./storage";
import { clientKey, rateLimit } from "./rate-limit";
import { submitVisitorFeedback } from "@/modules/feedback/application/submit-visitor-feedback";
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
  const site = await db.site.findFirst({ where: { publicKey: data.siteKey, company: { profile: { status: "ACTIVE" } } } });
  if (!site?.companyId) throw new HttpError(404, "Widget tidak ditemukan.");
  const file = form.get("screenshot");
  if (file && !(file instanceof File)) throw new HttpError(400, "Lampiran tidak valid.");
  if (file instanceof File && file.size > 5 * 1024 * 1024) throw new HttpError(413, "Screenshot maksimal 5 MiB.");
  const imageHash = file instanceof File && file.size ? createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex") : null;
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...data, imageHash })).digest("hex");
  const input = { siteKey: data.siteKey, submissionId: data.submissionId, fingerprint, type: data.type, message: data.message, email: data.email ?? undefined, pageUrl: data.pageUrl ?? undefined };
  return submitVisitorFeedback(input, file instanceof File && file.size ? new Uint8Array(await file.arrayBuffer()) : null, {
    resolve: async key => { const current = await db.site.findFirst({ where: { publicKey: key, company: { profile: { status: "ACTIVE" } } } }); return current ? { companyId: current.companyId, siteId: current.id } : null; },
    reserve: (companyId, siteId, value) => reserveVisitorReport(db, companyId, siteId, value.submissionId, new Date(), value.fingerprint),
    stage: (companyId, image) => stageAttachment(image, companyId),
    persist: (companyId, reservation, value, staged) => persistVisitorReport(db, companyId, reservation, { siteId: reservation.siteId, submissionId: value.submissionId, fingerprint: value.fingerprint, type: value.type, message: value.message, email: value.email, pageUrl: value.pageUrl }, staged),
    discard: staged => discardAttachment(staged.id, staged.key),
    release: (companyId, reservation) => releaseVisitorReservation(db, companyId, reservation.id),
  });
}
