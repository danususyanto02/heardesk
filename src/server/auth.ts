import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { db } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
import { companyOrganizationPlugin } from "@/modules/companies/infrastructure/auth-organization-plugin";
import type { Actor } from "@/modules/identity/domain/session";
import { emailSender } from "./composition/email-services";
import { authEmailOptions } from "@/modules/identity/infrastructure/auth-email-options";
import { localSignupEnabled } from "@/modules/identity/infrastructure/signup-policy";
export function getAuth() {
  const config = env();
  const mail = process.env.HEARDESK_EMAIL_MODE === "local" ? authEmailOptions(emailSender()) : null;
  return betterAuth({ database: prismaAdapter(db, { provider: "postgresql" }), baseURL: config.APP_URL, secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(config.APP_URL).origin], emailAndPassword: { enabled: true, disableSignUp: !localSignupEnabled(process.env), minPasswordLength: 15, maxPasswordLength: 128, requireEmailVerification: true, revokeSessionsOnPasswordReset: true, ...(mail ? { sendResetPassword: mail.sendResetPassword } : {}) },
    ...(mail ? { emailVerification: mail.emailVerification } : {}),
    user: { additionalFields: { platformRole: { type: ["USER", "PLATFORM_OWNER"], defaultValue: "USER", input: false } } },
    plugins: [companyOrganizationPlugin()],
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
export async function requireActor(requestHeaders?: Headers): Promise<Actor> {
  const session = await getAuth().api.getSession({ headers: requestHeaders ?? await headers(), query: { disableCookieCache: true } });
  if (!session) throw new HttpError(401, "Silakan masuk kembali.");
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, emailVerified: true, platformRole: true } });
  if (!user) throw new HttpError(401, "Silakan masuk kembali.");
  return { userId: user.id, emailVerified: user.emailVerified, platformRole: user.platformRole };
}
