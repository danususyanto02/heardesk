import { randomBytes } from "node:crypto";
import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { rotateKeyInput } from "@/lib/validation";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { z } from "zod";
export async function POST(request: Request, { params }: { params: Promise<{ companyId: string; siteId: string }> }) {
  try { assertOrigin(request); const { companyId, siteId } = await params, { actor, services } = await companyApi(request, companyId); await rateLimit("key-rotation:" + clientKey(request), 5, 600); const input = rotateKeyInput.parse(await readJson(request)); return json(await services.rotateKey(actor, companyId, z.coerce.number().int().positive().parse(siteId), input.expectedKey, randomBytes(24).toString("base64url"))); } catch (error) { return failure(error); }
}
