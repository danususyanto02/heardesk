import { expect, it, vi } from "vitest";
import { failure, HttpError } from "@/server/http";
import { CompanyAccessError } from "@/modules/companies/domain/access";
import { z } from "zod";

it("preserves field errors and request metadata for nested validation failures", async () => {
  const schema = z.object({ name: z.string(), profile: z.object({ age: z.number() }) });
  const parsed = schema.safeParse({ name: 42, profile: { age: "invalid" } });
  expect(parsed.success).toBe(false);
  if (parsed.success) {
    throw new Error("Invalid fixture accepted");
  }
  const response = failure(parsed.error);
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toMatchObject({
    code: "VALIDATION_ERROR",
    message: "Periksa isian formulir.",
    fields: { name: [expect.any(String)], profile: [expect.any(String)] },
    requestId: expect.any(String),
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("keeps form-level validation errors out of the field map", async () => {
  const parsed = z.string().safeParse(null);
  if (parsed.success) {
    throw new Error("Invalid fixture accepted");
  }
  const response = failure(parsed.error);
  expect(response.status).toBe(400);
  expect((await response.json()).error.fields).toEqual({});
});
it("unverified platform identity is a forbidden response, not an infrastructure failure", async () => {
  const response = failure(
    Object.assign(new Error("Verify email first"), { code: "EMAIL_NOT_VERIFIED" }),
  );
  expect(response.status).toBe(403);
  expect((await response.json()).error.code).toBe("EMAIL_NOT_VERIFIED");
});

it.each(["constructor", "toString", "__proto__"])(
  "does not treat inherited object key %s as a domain response",
  async (code) => {
    const response = failure(new HttpError(422, "Invalid request", code));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code, message: "Invalid request" } });
  },
);

it("keeps unknown error details private", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = failure(Object.assign(new Error("private details"), { code: "constructor" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
  } finally {
    log.mockRestore();
  }
});

it("keeps suspended Company access distinct from rejected visitor submissions", async () => {
  const access = failure(new CompanyAccessError("COMPANY_SUSPENDED"));
  expect(access.status).toBe(403);
  expect(await access.json()).toMatchObject({ error: { message: "Company access denied." } });
  const submission = failure(Object.assign(new Error("suspended"), { code: "COMPANY_SUSPENDED" }));
  expect(submission.status).toBe(403);
  expect(await submission.json()).toMatchObject({
    error: { message: "Submission cannot be accepted. Try again later." },
  });
});
