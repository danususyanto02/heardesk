import { expect, it } from "vitest";
import { localSignupEnabled } from "@/modules/identity/infrastructure/signup-policy";
it("signup requires explicit local flag, email capture and loopback application URL", () => {
  expect(localSignupEnabled({ HEARDESK_LOCAL_SIGNUP: "true", HEARDESK_EMAIL_MODE: "local", APP_URL: "http://localhost:3000" })).toBe(true);
  expect(localSignupEnabled({ HEARDESK_LOCAL_SIGNUP: "true", HEARDESK_EMAIL_MODE: "local", APP_URL: "http://127.0.0.1:3100" })).toBe(true);
  for (const values of [{}, { HEARDESK_LOCAL_SIGNUP: "false", HEARDESK_EMAIL_MODE: "local", APP_URL: "http://localhost:3000" }, { HEARDESK_LOCAL_SIGNUP: "true", HEARDESK_EMAIL_MODE: "local", APP_URL: "https://client.test" }, { HEARDESK_LOCAL_SIGNUP: "true", APP_URL: "http://localhost:3000" }, { HEARDESK_LOCAL_SIGNUP: "true", HEARDESK_EMAIL_MODE: "local", APP_URL: "invalid" }]) expect(localSignupEnabled(values)).toBe(false);
});
