import { z } from "zod";
import { statuses, types } from "@/lib/validation";

export const feedbackQueryInput = z.object({ q: z.string().max(500).default(""), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().refine(value => [10,25,50,100].includes(value)).default(25), siteId: z.coerce.number().int().min(1).optional(), type: z.enum(types).optional(), status: z.enum(statuses).optional(), from: z.iso.datetime().optional(), to: z.iso.datetime().optional() }).refine(value => !value.from || !value.to || Date.parse(value.from) < Date.parse(value.to), { message: "Invalid date range" });
