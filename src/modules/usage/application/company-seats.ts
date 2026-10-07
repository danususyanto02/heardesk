import type { Actor } from "../../identity/domain/session";
import type { Clock } from "../domain/usage";
import type { InvitationRole, SeatAllocationPort } from "../domain/seat-repository";

export function companySeats(port: SeatAllocationPort, clock: Clock) {
  return {
    async reserve(actor: Actor, companyId: string, emailInput: string, role: InvitationRole) {
      const email = emailInput.trim().toLowerCase();
      if (!["ADMIN", "AGENT", "VIEWER"].includes(role)) throw Object.assign(new Error("Invalid invitation role"), { code: "INVITATION_ROLE_INVALID" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw Object.assign(new Error("Invalid email"), { code: "INVITATION_EMAIL_INVALID" });
      return port.reserve(actor, companyId, email, role, clock);
    },
    revoke: (actor: Actor, companyId: string, invitationId: string) => port.revoke(actor, companyId, invitationId),
    accept: (actor: Actor, companyId: string, invitationId: string) => port.accept(actor, companyId, invitationId, clock),
  };
}
