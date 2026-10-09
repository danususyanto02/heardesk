import type { SessionReader } from "../../identity/domain/session";
import { requirePlatformOwner } from "../../identity/application/require-platform-owner";
import type { UserOperations, UserAction } from "../domain/user-operations";
export function platformUsers(repository: UserOperations, session: SessionReader) {
  return {
    detail: async (id: string) =>
      repository.detail((await requirePlatformOwner(session)).userId, id),
    async change(id: string, action: UserAction, reason: string) {
      const actor = await requirePlatformOwner(session);
      if (
        !reason.trim() ||
        reason.trim().length > 500 ||
        !["SUSPEND", "REACTIVATE", "REVOKE_SESSIONS"].includes(action)
      ) {
        throw Object.assign(new Error("Reason required"), { code: "PLATFORM_INPUT_INVALID" });
      }
      await repository.change(actor.userId, id, action, reason.trim());
    },
  };
}
