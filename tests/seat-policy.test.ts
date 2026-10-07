import { expect, it } from "vitest";
import { occupiedSeats, invitationAcceptable } from "@/modules/usage/domain/seat-policy";
it("counts only distinct live invites not already represented by member email", () => {
  const now = new Date("2026-10-06"), expiresAt = new Date("2026-10-07");
  expect(occupiedSeats([{ id: "a", email: "a@test.com" }], [
    { id: "1", email: "A@test.com", expiresAt, status: "pending", role: "VIEWER" },
    { id: "2", email: "b@test.com", expiresAt, status: "pending", role: "VIEWER" },
    { id: "3", email: "B@test.com", expiresAt, status: "pending", role: "VIEWER" },
    { id: "4", email: "c@test.com", expiresAt: now, status: "pending", role: "VIEWER" },
  ], now)).toBe(2);
});
it("never accepts owner, expired, wrong-email or revoked invitation", () => {
  const now = new Date("2026-10-06"), invite = { id: "i", email: "a@test.com", expiresAt: new Date("2026-10-07"), status: "pending", role: "AGENT" };
  expect(invitationAcceptable(invite, "A@test.com", now)).toBe(true);
  for (const invalid of [{ ...invite, role: "OWNER" }, { ...invite, status: "canceled" }, { ...invite, expiresAt: now }, { ...invite, email: "wrong@test.com" }]) expect(invitationAcceptable(invalid, "a@test.com", now)).toBe(false);
});
