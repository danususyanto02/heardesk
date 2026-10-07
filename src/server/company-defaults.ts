import { z } from "zod";
import { HttpError } from "./http";

export function companyDefaults() {
  const result = z.object({
    HEARDESK_DEFAULT_WEBSITES: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)),
    HEARDESK_DEFAULT_SEATS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)),
    HEARDESK_DEFAULT_MONTHLY_REPORTS: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)),
    HEARDESK_DEFAULT_STORAGE_BYTES: z.string().regex(/^\d+$/).transform(BigInt),
  }).safeParse(process.env);
  if (!result.success) throw new HttpError(503, "Operator must configure Company allowances before onboarding.", "COMPANY_DEFAULTS_MISSING");
  return { websiteLimit: result.data.HEARDESK_DEFAULT_WEBSITES, seatLimit: result.data.HEARDESK_DEFAULT_SEATS, monthlyReportLimit: result.data.HEARDESK_DEFAULT_MONTHLY_REPORTS, storageBytesLimit: result.data.HEARDESK_DEFAULT_STORAGE_BYTES };
}
