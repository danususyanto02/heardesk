import { describe, expect, it } from "vitest";
import { validInvitationEmail } from "@/modules/shared/domain/email";

describe("validInvitationEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(validInvitationEmail("agent@example.test")).toBe(true);
    expect(validInvitationEmail("first.last+tag@sub.example.co")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    for (const value of ["", "plain", "a@b", "@example.test", "a@@b.test", "a b@example.test"]) {
      expect(validInvitationEmail(value)).toBe(false);
    }
  });

  it("rejects addresses longer than 254 characters", () => {
    const local = "a".repeat(250);
    expect(validInvitationEmail(`${local}@example.test`)).toBe(false);
  });

  it("rejects very long adversarial input", () => {
    const adversarial = "a@" + "a".repeat(100_000);
    expect(validInvitationEmail(adversarial)).toBe(false);
  });

  it("preserves the existing invitation policy for domain separators", () => {
    expect(validInvitationEmail("a@b.c.")).toBe(true);
    expect(validInvitationEmail("a@.b.c")).toBe(true);
    expect(validInvitationEmail("a@b.")).toBe(false);
    expect(validInvitationEmail("a@.c")).toBe(false);
    expect(validInvitationEmail("a@b.\nc")).toBe(false);
    expect(validInvitationEmail("a".repeat(250) + "@b.c")).toBe(true);
    expect(validInvitationEmail("a".repeat(251) + "@b.c")).toBe(false);
  });
});
