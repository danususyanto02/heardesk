import { legacyCompanyContext } from "@/server/company-context";
import { failure, json } from "@/server/http";
import { statuses, types } from "@/lib/validation";
import { z } from "zod";
import { requireActor } from "@/server/auth";
import { db } from "@/server/db";
export async function GET(request: Request) {
  try {
    const current = await requireActor(request.headers);
    if (!await db.member.findFirst({ where: { userId: current.userId } })) return json({ items: [], total: 0, page: 1, pageSize: 20 });
    const { actor, companyId, services } = await legacyCompanyContext(request.headers);
    const input = z.object({ q: z.string().max(500).default(""), type: z.enum(types).optional(), status: z.enum(statuses).optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await services.listFeedback(actor, companyId, input);
    return json({ ...result, items: result.items.map(item => ({ ...item, attachment: item.attachmentId ? { id: item.attachmentId } : null })) });
  } catch (error) { return failure(error); }
}
