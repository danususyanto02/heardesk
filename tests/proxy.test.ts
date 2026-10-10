import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
const site = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { site } }));
afterEach(() => {
  vi.unstubAllEnvs();
  site.findFirst.mockReset();
});
it("overwrites forged Company headers using explicit URL scope and sets private CSP", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const response = await proxy(
    new NextRequest("https://feedback.test/inbox?company=x", {
      headers: { "x-heardesk-company": "forged" },
    }),
  );
  expect(response.headers.get("x-middleware-request-x-heardesk-company")).toBe("x");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  expect(response.headers.get("content-security-policy")).not.toContain("unsafe-eval");
});
it("removes inherited scope when URL has no acceptable Company selector", async () => {
  for (const query of ["", "?company=" + "x".repeat(201)]) {
    const response = await proxy(
      new NextRequest("https://feedback.test/inbox" + query, {
        headers: { "x-heardesk-company": "forged" },
      }),
    );
    expect(response.headers.get("x-middleware-request-x-heardesk-company")).toBeNull();
  }
});
it("allows widget framing only by the registered active website", async () => {
  site.findFirst.mockResolvedValue({ origin: "https://shop.test" });
  const response = await proxy(new NextRequest("https://feedback.test/widget/key"));
  expect(response.headers.get("content-security-policy")).toContain(
    "frame-ancestors 'self' https://shop.test",
  );
  expect(response.headers.has("x-frame-options")).toBe(false);
});
it.each([null, new Error("Database unavailable")])(
  "denies widget framing when registration cannot be resolved",
  async (result) => {
    if (result instanceof Error) {
      site.findFirst.mockRejectedValue(result);
    } else {
      site.findFirst.mockResolvedValue(result);
    }
    const response = await proxy(new NextRequest("https://feedback.test/widget/key"));
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  },
);
