import { requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { companyDefaults } from "@/server/company-defaults";
import { createCompanyOnboarding } from "@/server/composition/company-onboarding";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { z } from "zod";
export async function GET(request: Request) {
  try { const actor = await requireActor(request.headers); return json(await createCompanyOnboarding(db, companyDefaults()).list(actor)); } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { assertOrigin(request); const actor = await requireActor(request.headers); await rateLimit("company-create:" + actor.userId + ":" + clientKey(request), 5, 600); const input = z.object({ name: z.string().trim().min(1).max(120), idempotencyKey: z.string().min(8).max(128) }).strict().parse(await readJson(request)); return json(await createCompanyOnboarding(db, companyDefaults()).create(actor, input), 201); } catch (error) { return failure(error); }
}
