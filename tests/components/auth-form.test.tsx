// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthForm } from "@/components/auth-form";
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
beforeEach(() => {
  router.replace.mockClear();
  router.refresh.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function fill(setup = false) {
  fireEvent.change(screen.getByLabelText(setup ? "Email admin" : "Email"), {
    target: { value: "person@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Long-password-example-2026!" },
  });
  if (setup) {
    fireEvent.change(screen.getByLabelText("Kode aktivasi instalasi"), {
      target: { value: "x".repeat(32) },
    });
  }
}
it("signs in and navigates to role-aware dashboard", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ success: true }));
  render(<AuthForm signupEnabled />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Lihat" }));
  expect(screen.getByLabelText("Password").getAttribute("type")).toBe("text");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
  expect(screen.getByRole("link", { name: "Create account" }).getAttribute("href")).toBe("/signup");
});
it("shows login errors without navigating", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ error: { message: "Invalid credentials" } }, { status: 401 }),
  );
  render(<AuthForm />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Invalid credentials");
  expect(router.replace).not.toHaveBeenCalled();
});
it("never repeats account creation when automatic login fails", async () => {
  vi.stubGlobal("fetch", async (path: string) =>
    path === "/api/setup" ? Response.json({ success: true }) : Response.json({}, { status: 503 }),
  );
  render(<AuthForm setup />);
  fill(true);
  fireEvent.click(screen.getByRole("button", { name: "Buat akun" }));
  await screen.findByRole("heading", { name: "Akun admin sudah dibuat" });
  expect(screen.queryByRole("button", { name: "Buat akun" })).toBeNull();
  expect(screen.getByRole("link", { name: "Masuk ke akun baru" }).getAttribute("href")).toBe(
    "/login?setup=done",
  );
});
it("opens installation onboarding after successful setup and automatic login", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ success: true }));
  render(<AuthForm setup />);
  fill(true);
  fireEvent.click(screen.getByRole("button", { name: "Buat akun" }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/settings?onboarding=1"));
});
