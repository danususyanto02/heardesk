import { z } from "zod";
export function env() {
  return z.object({
    DATABASE_URL: z.string().min(1), APP_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(32), UREPORT_SETUP_TOKEN: z.string().min(32),
    STORAGE_DIR: z.string().default("storage"), STORAGE_QUOTA_BYTES: z.coerce.number().int().positive().default(1073741824),
    MIN_FREE_BYTES: z.coerce.number().int().nonnegative().default(268435456),
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  }).parse(process.env);
}
