import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { trustedOrigin } from "@/lib/validation";
import { env } from "./env";
export class HttpError extends Error { constructor(public status: number, message: string, public code = "REQUEST_FAILED") { super(message); } }
export function assertOrigin(request: Request) { if (!trustedOrigin(request.headers.get("origin"), env().APP_URL)) throw new HttpError(403, "Origin request tidak diizinkan."); }
export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: privateHeaders }); }
export function failure(error: unknown) {
  const id = randomUUID();
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
