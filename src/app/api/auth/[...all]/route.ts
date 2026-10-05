import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";
import { assertOrigin, boundedBytes, failure, HttpError } from "@/server/http";
import { rateLimit, clientKey } from "@/server/rate-limit";
export async function GET(request: Request) { return toNextJsHandler(getAuth()).GET(request); }
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (new URL(request.url).pathname.includes("sign-up")) throw new HttpError(403, "Registrasi publik tidak tersedia.");
    await rateLimit("auth:" + clientKey(request), 10); await rateLimit("auth:global", 60);
    const body = await boundedBytes(request, 32768);
    return toNextJsHandler(getAuth()).POST(new Request(request.url, { method: "POST", headers: request.headers, body }));
  } catch (error) { return failure(error); }
}
