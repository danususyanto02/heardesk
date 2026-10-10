import { createHmac, randomInt } from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
export function clientKey(request: Request) {
  const config = env();
  const address =
    config.TRUST_PROXY === "true"
      ? (request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown")
      : "untrusted-network";
  return createHmac("sha256", config.BETTER_AUTH_SECRET).update(address).digest("hex");
}
export async function rateLimit(key: string, max: number, seconds = 60) {
  const now = new Date();
  const end = new Date(Date.now() + seconds * 1000);
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateBucket" (key, count, "expiresAt") VALUES (${key},1,${end}) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateBucket"."expiresAt" < ${now} THEN 1 ELSE "RateBucket".count + 1 END, "expiresAt" = CASE WHEN "RateBucket"."expiresAt" < ${now} THEN ${end} ELSE "RateBucket"."expiresAt" END RETURNING count`;
  if (rows[0].count > max) {
    throw new HttpError(
      429,
      "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.",
      "RATE_LIMITED",
    );
  }
  // Non-security sampling: this only decides how often expired buckets are swept.
  // Rate-limit enforcement is the INSERT/count above; predicting this value grants no bypass.
  if (randomInt(50) === 0) {
    await db.rateBucket.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 3600000) } },
    });
  }
}
