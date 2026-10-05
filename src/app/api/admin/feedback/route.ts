import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { failure, json } from "@/server/http";
import { statuses, types } from "@/lib/validation";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    await requireAdmin(request.headers);
    const params = new URL(request.url).searchParams;
    const input = z.object({ q: z.string().max(500).default(""), type: z.enum(types).optional(), status: z.enum(statuses).optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).parse(Object.fromEntries(params));
    const where = { siteId: 1, ...(input.q ? { message: { contains: input.q, mode: "insensitive" as const } } : {}), type: input.type, status: input.status };
    const total = await db.feedback.count({ where }), page = Math.min(input.page, Math.max(1, Math.ceil(total / 20)));
    const items = await db.feedback.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20, select: { id: true, message: true, type: true, status: true, createdAt: true, attachment: { select: { id: true } } } });
    return json({ items, total, page, pageSize: 20 });
  } catch (error) { return failure(error); }
}
