import type { PlatformUser } from "./platform-repository";
export type UserAction = "SUSPEND" | "REACTIVATE" | "REVOKE_SESSIONS";
export interface UserOperations {
  detail(actorId: string, userId: string): Promise<PlatformUser & { accountStatus: string }>;
  change(actorId: string, userId: string, action: UserAction, reason: string): Promise<void>;
}
