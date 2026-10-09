import type { Actor, SessionReader } from "../domain/session";

export async function requirePlatformOwner(session: SessionReader): Promise<Actor> {
  const actor = await session.current();
  if (!actor) {
    throw Object.assign(new Error("Authentication required"), { code: "UNAUTHENTICATED" });
  }
  if (!actor.emailVerified) {
    throw Object.assign(new Error("Verify email first"), { code: "EMAIL_NOT_VERIFIED" });
  }
  if (actor.platformRole !== "PLATFORM_OWNER") {
    throw Object.assign(new Error("Platform owner required"), { code: "PLATFORM_FORBIDDEN" });
  }
  return actor;
}
