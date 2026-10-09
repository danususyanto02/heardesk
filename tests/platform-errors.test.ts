import { expect, it, vi } from "vitest";
import { failure, HttpError } from "@/server/http";
import { CompanyAccessError } from "@/modules/companies/domain/access";
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
