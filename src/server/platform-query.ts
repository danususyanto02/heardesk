import { z } from "zod";
export function platformQuery(params: Record<string, string | string[] | undefined>) { return z.object({ q: z.string().max(200).default(""), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().refine(value => [10,25,50,100].includes(value)).default(25) }).parse(params); }
