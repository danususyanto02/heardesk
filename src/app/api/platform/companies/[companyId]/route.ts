import { z } from "zod";
import { platformServices } from "@/server/platform-access";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { clientKey, rateLimit } from "@/server/rate-limit";
type Context = { params: Promise<{ companyId: string }> };
export async function GET(request: Request, { params }: Context) {
  try { return json(await platformServices(request.headers).company((await params).companyId)); } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    assertOrigin(request); const { companyId } = await params, services = platformServices(request.headers);
    await services.company(companyId);
    await rateLimit("platform-mutation:" + clientKey(request), 20, 60);
    const shared = { reason: z.string().trim().min(1).max(500), expectedUpdatedAt: z.iso.datetime() };
    const input = z.discriminatedUnion("action", [
      z.object({ action: z.literal("status"), status: z.enum(["ACTIVE", "SUSPENDED"]), ...shared }).strict(),
      z.object({ action: z.literal("limits"), websites: z.number().int().min(0).max(2147483647), seats: z.number().int().min(0).max(2147483647), monthlyReports: z.number().int().min(0).max(2147483647), storageBytes: z.string().regex(/^\d{1,19}$/), ...shared }).strict(),
    ]).parse(await readJson(request));
    return json(input.action === "status" ? await services.setStatus(companyId, input) : await services.setLimits(companyId, input));
  } catch (error) { return failure(error); }
}
