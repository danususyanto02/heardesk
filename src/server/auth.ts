import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { db } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
export function getAuth() {
  const config = env();
  return betterAuth({ database: prismaAdapter(db, { provider: "postgresql" }), baseURL: config.APP_URL, secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(config.APP_URL).origin], emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 15, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 12, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: config.APP_URL.startsWith("https:"), disableCSRFCheck: false, disableOriginCheck: false },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 20 },
  });
}
export async function requireAdmin(requestHeaders?: Headers) {
  const session = await getAuth().api.getSession({ headers: requestHeaders ?? await headers(), query: { disableCookieCache: true } });
  if (!session) throw new HttpError(401, "Silakan masuk kembali.");
  const install = await db.installation.findUnique({ where: { id: 1 } });
  if (install?.adminId !== session.user.id) throw new HttpError(403, "Akses admin diperlukan.");
  return session.user;
}
