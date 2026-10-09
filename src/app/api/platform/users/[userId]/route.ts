import { z } from "zod";
import { requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { createPlatformUsers } from "@/server/composition/platform-users";
import { assertOrigin, failure, json, readJson } from "@/server/http";
type Context = { params: Promise<{ userId: string }> };
const service = (headers: Headers) =>
  createPlatformUsers(db, { current: () => requireActor(headers) });
export async function GET(request: Request, { params }: Context) {
  try {
    return json(await service(request.headers).detail((await params).userId));
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    assertOrigin(request);
    const input = z
      .object({
        action: z.enum(["SUSPEND", "REACTIVATE", "REVOKE_SESSIONS"]),
        reason: z.string().trim().min(1).max(500),
      })
      .strict()
      .parse(await readJson(request));
    await service(request.headers).change((await params).userId, input.action, input.reason);
    return json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
