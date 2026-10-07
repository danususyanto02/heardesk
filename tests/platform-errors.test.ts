import { expect, it } from "vitest";
import { failure } from "@/server/http";
it("unverified platform identity is a forbidden response, not an infrastructure failure", async () => {
  const response = failure(Object.assign(new Error("Verify email first"), { code: "EMAIL_NOT_VERIFIED" }));
  expect(response.status).toBe(403);
  expect((await response.json()).error.code).toBe("EMAIL_NOT_VERIFIED");
});
