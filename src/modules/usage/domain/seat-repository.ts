import type { Actor } from "../../identity/domain/session";
import type { Clock } from "./usage";
import type { SeatInvitation } from "./seat-policy";

export type InvitationRole = "ADMIN" | "AGENT" | "VIEWER";
export type MemberSeat = Readonly<{
  id: string;
  userId: string;
  organizationId: string;
  role: string;
}>;
export interface SeatAllocationPort {
  reserve(
    actor: Actor,
    companyId: string,
    email: string,
    role: InvitationRole,
    clock: Clock,
  ): Promise<SeatInvitation>;
  revoke(actor: Actor, companyId: string, invitationId: string): Promise<void>;
  accept(actor: Actor, companyId: string, invitationId: string, clock: Clock): Promise<MemberSeat>;
}
