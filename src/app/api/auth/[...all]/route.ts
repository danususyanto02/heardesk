import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";
import { assertOrigin, boundedBytes, failure, HttpError } from "@/server/http";
import { rateLimit, clientKey } from "@/server/rate-limit";
import { createOrganizationBoundary } from "@/modules/companies/infrastructure/auth-organization-policy";
import { localSignupEnabled } from "@/modules/identity/infrastructure/signup-policy";
import { db } from "@/server/db";
import { cookies } from "next/headers";
export const GET = createOrganizationBoundary(async request => toNextJsHandler(getAuth()).GET(request));
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (new URL(request.url).pathname.includes("sign-up") && (!localSignupEnabled(process.env) || !await db.installation.findUnique({ where: { id: 1 } }))) throw new HttpError(403, "Registrasi publik tidak tersedia.");
    await rateLimit("auth:" + clientKey(request), 10); await rateLimit("auth:global", 60);
    const body = await boundedBytes(request, 32768);
    const response = await createOrganizationBoundary(async incoming => toNextJsHandler(getAuth()).POST(incoming))(new Request(request.url, { method: "POST", headers: request.headers, body }));
    if (response.ok && new URL(request.url).pathname.endsWith("/sign-out")) (await cookies()).delete("heardesk-company");
    return response;
  } catch (error) { return failure(error); }
}
