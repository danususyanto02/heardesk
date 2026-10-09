import { z } from "zod";
export const statisticsQuery = z
  .object({
    period: z.enum(["monthly", "annual", "all"]).default("annual"),
    year: z.coerce.number().int().min(1900).max(9998).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    siteId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.period !== "all" && !value.year) {
      ctx.addIssue({ code: "custom", message: "Year required", path: ["year"] });
    }
    if (value.period === "monthly" && !value.month) {
      ctx.addIssue({ code: "custom", message: "Month required", path: ["month"] });
    }
  });
