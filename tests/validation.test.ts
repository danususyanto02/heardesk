import { describe, it, expect } from "vitest";
import {
  feedbackInput,
  setupInput,
  siteInput,
  cleanPageUrl,
  trustedOrigin,
  connectSiteInput,
} from "../src/lib/validation";
describe("public input boundaries", () => {
  it("creates an admin without website or name input", () => {
    const result = setupInput.safeParse({
      email: "admin@example.com",
      password: "A-long-password-2026!",
      token: "x".repeat(32),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Admin");
    }
  });
  it("normalizes website page addresses into an allowlisted origin", () => {
    expect(
      connectSiteInput.parse({ address: "https://website.example/path?secret=yes#value" }).address,
    ).toBe("https://website.example");
    expect(connectSiteInput.safeParse({ address: "javascript:alert(1)" }).success).toBe(false);
    expect(
      connectSiteInput.safeParse({ address: "https://user:pass@website.example/" }).success,
    ).toBe(false);
  });
  it("rejects empty messages and oversized input", () => {
    expect(
      feedbackInput.safeParse({
        siteKey: "example",
        submissionId: crypto.randomUUID(),
        type: "ISSUE",
        message: "  ",
      }).success,
    ).toBe(false);
    expect(
      feedbackInput.safeParse({
        siteKey: "example",
        submissionId: crypto.randomUUID(),
        type: "ISSUE",
        message: "a".repeat(5001),
      }).success,
    ).toBe(false);
  });
  it("keeps text, strips URL credentials and sensitive query", () => {
    expect(cleanPageUrl("https://website.example/path?token=secret#value")).toBe(
      "https://website.example/path",
    );
    expect(cleanPageUrl("javascript:alert(1)")).toBeNull();
    expect(cleanPageUrl("https://user:pass@website.example/")).toBeNull();
  });
  it("only accepts exact HTTP origins", () => {
    expect(
      siteInput.safeParse({
        name: "Website",
        origin: "https://website.example/path",
        buttonLabel: "Feedback",
        position: "right",
      }).success,
    ).toBe(false);
    expect(trustedOrigin("null", "https://app.example")).toBe(false);
    expect(trustedOrigin("https://app.example.evil", "https://app.example")).toBe(false);
    expect(trustedOrigin("https://app.example", "https://app.example")).toBe(true);
  });
  it("requires a long bootstrap password", () => {
    expect(
      setupInput.safeParse({
        name: "Admin",
        email: "admin@example.com",
        password: "short",
        siteName: "Website",
        origin: "https://website.example",
        token: "x".repeat(32),
      }).success,
    ).toBe(false);
  });
});
