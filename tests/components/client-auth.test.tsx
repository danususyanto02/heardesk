// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientAuth } from "@/components/client-auth";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("sends password recovery once and shows the account-neutral confirmation", async () => {
  let submitted: unknown;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    submitted = JSON.parse(options.body as string);
    return Response.json({ success: true });
  });
  render(<ClientAuth mode="forgot" />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  await screen.findByText("If an account exists, a reset link has been sent.");
  expect(submitted).toEqual({
    email: "person@example.test",
    redirectTo: location.origin + "/reset-password",
  });
  expect(screen.queryByRole("button", { name: "Send reset link" })).toBeNull();
});

it("shows failed recovery and allows retry", async () => {
  let attempts = 0;
  vi.stubGlobal("fetch", async () => {
    attempts++;
    return attempts === 1
      ? Response.json({ error: { message: "Email unavailable" } }, { status: 503 })
      : Response.json({ success: true });
  });
  render(<ClientAuth mode="forgot" />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Email unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  await screen.findByText("If an account exists, a reset link has been sent.");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("submits the reset token with the new password", async () => {
  let submitted: unknown;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    submitted = JSON.parse(options.body as string);
    return Response.json({ success: true });
  });
  render(<ClientAuth mode="reset" token="one-time-token" />);
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "Long-password-example-2026!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
  await screen.findByText("Your password has been changed.");
  expect(submitted).toEqual({
    token: "one-time-token",
    newPassword: "Long-password-example-2026!",
  });
});

it("prevents resetting without a token", () => {
  render(<ClientAuth mode="reset" />);
  expect(screen.getByRole("button", { name: "Reset password" }).hasAttribute("disabled")).toBe(
    true,
  );
  expect(screen.getByRole("alert").textContent).toContain("Reset link is missing");
});

it("resends verification while keeping the form disabled during the request", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  render(<ClientAuth mode="verify" verificationError="Link expired" />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Resend verification link" }));
  expect(screen.getByRole("button", { name: "Processing..." }).hasAttribute("disabled")).toBe(true);
  finish(Response.json({ success: true }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("a new link"));
});

it("shows verified identity without another verification form", () => {
  render(<ClientAuth mode="verify" verified />);
  expect(screen.getByRole("heading").textContent).toBe("Email verified");
  expect(screen.queryByLabelText("Email")).toBeNull();
  expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
});
