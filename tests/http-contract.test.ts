import { expect, it, vi } from "vitest";
import { boundedBytes, failure, HttpError, readJson } from "@/server/http";
import { CompanyAccessError } from "@/modules/companies/domain/access";

it.each([
  ["UNAUTHENTICATED", 401],
  ["COMPANY_NOT_FOUND", 404],
  ["RESOURCE_NOT_FOUND", 404],
  ["COMPANY_FORBIDDEN", 403],
  ["EMAIL_NOT_VERIFIED", 403],
] as const)("maps Company access %s to %s", async (code, status) => {
  const response = failure(new CompanyAccessError(code));
  expect(response.status).toBe(status);
  expect((await response.json()).error.code).toBe(code);
});

it.each([
  ["ACCOUNT_SUSPENDED", 403],
  ["PLATFORM_OWNER_PROTECTED", 403],
  ["PLATFORM_FORBIDDEN", 403],
  ["PLATFORM_INPUT_INVALID", 400],
  ["PLATFORM_NOT_FOUND", 404],
  ["PLATFORM_CONFLICT", 409],
  ["IDEMPOTENCY_CONFLICT", 409],
  ["UPLOAD_CAPACITY_UNAVAILABLE", 503],
  ["WIDGET_NOT_FOUND", 404],
  ["STALE_KEY", 409],
  ["COMPANY_QUOTA_EXCEEDED", 422],
  ["SUBMISSION_CONFLICT", 409],
  ["SUBMISSION_IN_PROGRESS", 409],
  ["RESERVATION_INVALID", 409],
])("returns the domain response for %s", async (code, status) => {
  const response = failure(Object.assign(new Error("private detail"), { code }));
  expect(response.status).toBe(status);
  expect((await response.json()).error).toMatchObject({ code, requestId: expect.any(String) });
});

it("logs only safe metadata for thrown non-Error values", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = failure({ secret: "do-not-log" });
    expect(response.status).toBe(503);
    expect(log.mock.calls[0][0]).not.toContain("do-not-log");
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      type: "Unknown",
      operation: "request_failed",
    });
  } finally {
    log.mockRestore();
  }
});

it("rejects advertised oversized bodies before reading and accepts a missing body", async () => {
  await expect(
    boundedBytes(new Request("http://localhost", { headers: { "content-length": "20" } }), 10),
  ).rejects.toMatchObject({ status: 413 });
  expect(await boundedBytes(new Request("http://localhost"), 10)).toEqual(Buffer.alloc(0));
});

it("parses JSON and distinguishes malformed payloads from size errors", async () => {
  const request = (body: string) => new Request("http://localhost", { method: "POST", body });
  expect(await readJson(request('{"ok":true}'))).toEqual({ ok: true });
  await expect(readJson(request("not-json"))).rejects.toMatchObject({
    status: 400,
    message: "JSON tidak valid.",
  });
  await expect(readJson(request("12345"), 2)).rejects.toBeInstanceOf(HttpError);
  await expect(readJson(request("12345"), 2)).rejects.toMatchObject({ status: 413 });
});
