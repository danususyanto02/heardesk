import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { trustedOrigin } from "@/lib/validation";
import { env } from "./env";
import { CompanyAccessError } from "@/modules/companies/domain/access";
export class HttpError extends Error { constructor(public status: number, message: string, public code = "REQUEST_FAILED") { super(message); } }
export function assertOrigin(request: Request) { if (!trustedOrigin(request.headers.get("origin"), env().APP_URL)) throw new HttpError(403, "Origin request tidak diizinkan."); }
export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: privateHeaders }); }
export function failure(error: unknown) {
  const id = randomUUID();
  if(error instanceof Error&&"code" in error&&error.code==="ACCOUNT_SUSPENDED")return json({error:{code:error.code,message:"Account suspended. Contact HearDesk support.",requestId:id}},403);
  if (error instanceof Error && "code" in error && error.code === "PLATFORM_OWNER_PROTECTED") return json({error:{code:error.code,message:"Platform Owner accounts cannot be suspended here.",requestId:id}},403);
  if (error instanceof Error && "code" in error && error.code === "EMAIL_NOT_VERIFIED") return json({ error: { code: error.code, message: "Verify your email before continuing.", requestId: id } }, 403);
  if (error instanceof Error && "code" in error && ["PLATFORM_FORBIDDEN", "PLATFORM_INPUT_INVALID", "PLATFORM_NOT_FOUND", "PLATFORM_CONFLICT"].includes(String(error.code))) return json({ error: { code: error.code, message: error.code === "PLATFORM_CONFLICT" ? "Company changed. Reload before trying again." : error.code === "PLATFORM_INPUT_INVALID" ? "Check the limits, reason and action details." : error.code === "PLATFORM_NOT_FOUND" ? "Company not found." : "Platform Owner access required.", requestId: id } }, error.code === "PLATFORM_FORBIDDEN" ? 403 : error.code === "PLATFORM_INPUT_INVALID" ? 400 : error.code === "PLATFORM_NOT_FOUND" ? 404 : 409);
  if (error instanceof Error && "code" in error && error.code === "IDEMPOTENCY_CONFLICT") return json({ error: { code: error.code, message: "Creation key already used. Start a new Company request.", requestId: id } }, 409);
  if (error instanceof Error && "code" in error && error.code === "UPLOAD_CAPACITY_UNAVAILABLE") return json({ error: { code: error.code, message: "Upload capacity unavailable. Try again later.", requestId: id } }, 503);
  if (error instanceof Error && "code" in error && error.code === "WIDGET_NOT_FOUND") return json({ error: { code: error.code, message: "Widget not found.", requestId: id } }, 404);
  if (error instanceof CompanyAccessError) return json({ error: { code: error.code, message: error.code === "RESOURCE_NOT_FOUND" || error.code === "COMPANY_NOT_FOUND" ? "Resource not found." : "Company access denied.", requestId: id } }, ["RESOURCE_NOT_FOUND", "COMPANY_NOT_FOUND"].includes(error.code) ? 404 : error.code === "UNAUTHENTICATED" ? 401 : 403);
  if (error instanceof Error && "code" in error && error.code === "STALE_KEY") return json({ error: { code: "STALE_KEY", message: "Key changed. Reload before trying again.", requestId: id } }, 409);
  if (error instanceof Error && "code" in error && ["SUBMISSION_CONFLICT", "SUBMISSION_IN_PROGRESS", "RESERVATION_INVALID", "COMPANY_QUOTA_EXCEEDED", "COMPANY_SUSPENDED"].includes(String(error.code))) return json({ error: { code: error.code, message: error.code === "COMPANY_QUOTA_EXCEEDED" ? "Company allowance exhausted." : "Submission cannot be accepted. Try again later.", requestId: id } }, error.code === "COMPANY_QUOTA_EXCEEDED" ? 422 : error.code === "COMPANY_SUSPENDED" ? 403 : 409);
  if (error instanceof ZodError) return json({ error: { code: "VALIDATION_ERROR", message: "Periksa isian formulir.", fields: error.flatten().fieldErrors, requestId: id } }, 400);
  if (error instanceof HttpError) return json({ error: { code: error.code, message: error.message, requestId: id } }, error.status);
  console.error(JSON.stringify({ requestId: id, operation: "request_failed", type: error instanceof Error ? error.name : "Unknown" }));
  return json({ error: { code: "INTERNAL_ERROR", message: "Permintaan gagal. Coba lagi.", requestId: id } }, 503);
}
export async function boundedBytes(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > limit) throw new HttpError(413, "Request terlalu besar.");
  const reader = request.body?.getReader(); if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new HttpError(413, "Request terlalu besar."); } chunks.push(value); } } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request, limit = 32768) { try { return JSON.parse((await boundedBytes(request, limit)).toString("utf8")); } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, "JSON tidak valid."); } }
