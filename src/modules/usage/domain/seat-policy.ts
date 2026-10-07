export type SeatMember = Readonly<{ id: string; email: string }>;
export type SeatInvitation = Readonly<{ id: string; email: string; expiresAt: Date; status: string; role: string | null }>;
export function occupiedSeats(members: readonly SeatMember[], invitations: readonly SeatInvitation[], now: Date): number {
  const emails = new Set(members.map(member => member.email.toLowerCase()));
  const pending = new Set(invitations.filter(invite => invite.status === "pending" && invite.expiresAt > now && !emails.has(invite.email.toLowerCase())).map(invite => invite.email.toLowerCase()));
  return members.length + pending.size;
}
export function invitationAcceptable(invite: SeatInvitation | null, verifiedEmail: string, now: Date): boolean {
  return !!invite && invite.status === "pending" && invite.expiresAt > now && invite.email.toLowerCase() === verifiedEmail.toLowerCase() && ["ADMIN", "AGENT", "VIEWER"].includes(invite.role ?? "");
}
