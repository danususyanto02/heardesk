import type { PrismaClient } from "@/generated/prisma/client";
import type { Clock } from "@/modules/usage/domain/usage";
import { companySeats } from "@/modules/usage/application/company-seats";
import { reserveInvitationSeat, revokeReservedSeat, acceptReservedSeat } from "@/modules/usage/infrastructure/prisma-seat-usage";

export function createSeatServices(db: PrismaClient, clock: Clock = { now: () => new Date() }) {
  return companySeats({
    reserve: (actor, companyId, email, role, current) => reserveInvitationSeat(db, actor, companyId, email, role, current),
    revoke: (actor, companyId, invitationId) => revokeReservedSeat(db, actor, companyId, invitationId, clock.now()),
    accept: (actor, companyId, invitationId, current) => acceptReservedSeat(db, actor, companyId, invitationId, current),
  }, clock);
}
