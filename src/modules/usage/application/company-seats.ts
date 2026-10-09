import type { Actor } from "../../identity/domain/session";
import type { Clock } from "../domain/usage";
import type { InvitationRole, SeatAllocationPort } from "../domain/seat-repository";
import { validInvitationEmail } from "../../shared/domain/email";

export function companySeats(port: SeatAllocationPort, clock: Clock) {
  return {
    async reserve(actor: Actor, companyId: string, emailInput: string, role: InvitationRole) {
      const email = emailInput.trim().toLowerCase();
      if (!["ADMIN", "AGENT", "VIEWER"].includes(role)) {
        throw Object.assign(new Error("Invalid invitation role"), {
          code: "INVITATION_ROLE_INVALID",
        });
      }
      if (!validInvitationEmail(email)) {
        throw Object.assign(new Error("Invalid email"), { code: "INVITATION_EMAIL_INVALID" });
      }
      return port.reserve(actor, companyId, email, role, clock);
    },
    revoke: (actor: Actor, companyId: string, invitationId: string) =>
      port.revoke(actor, companyId, invitationId),
    accept: (actor: Actor, companyId: string, invitationId: string) =>
      port.accept(actor, companyId, invitationId, clock),
  };
}
