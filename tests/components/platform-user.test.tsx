// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlatformUserEditor } from "@/components/platform-user";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const user = {
  id: "u1",
  name: "Person",
  email: "person@example.test",
  emailVerified: true,
  platformRole: "USER" as const,
  accountStatus: "ACTIVE",
  createdAt: "2026-10-10T00:00:00Z",
  companies: [],
};
it.each(["SUSPEND", "REVOKE_SESSIONS"])(
  "persists %s with a reason and refreshes account state",
  async (action) => {
    let submitted: unknown;
    vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
      if (options.method === "PATCH") {
        submitted = JSON.parse(options.body as string);
        return Response.json({ ok: true });
      }
      return Response.json({
        ...user,
        accountStatus: action === "SUSPEND" ? "SUSPENDED" : "ACTIVE",
      });
    });
    render(<PlatformUserEditor initial={user} />);
    fireEvent.change(screen.getByLabelText("Reason for account action"), {
      target: { value: "Owner request" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: action === "SUSPEND" ? "Suspend account" : "Revoke sessions",
      }),
    );
    await screen.findByText(
      action === "SUSPEND" ? "Account status updated." : "All sessions revoked.",
    );
    expect(submitted).toEqual({ action, reason: "Owner request" });
    expect((screen.getByLabelText("Reason for account action") as HTMLTextAreaElement).value).toBe(
      "",
    );
  },
);
it("protects Platform Owner suspension and requires a revocation reason", () => {
  render(<PlatformUserEditor initial={{ ...user, platformRole: "PLATFORM_OWNER" }} />);
  expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull();
  expect(screen.getByRole("button", { name: "Revoke sessions" }).hasAttribute("disabled")).toBe(
    true,
  );
});
it("preserves reason and account status after rejected action", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ error: { message: "Denied" } }, { status: 403 }),
  );
  render(<PlatformUserEditor initial={{ ...user, accountStatus: "SUSPENDED" }} />);
  fireEvent.change(screen.getByLabelText("Reason for account action"), {
    target: { value: "Resolved" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reactivate account" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Reason for account action") as HTMLTextAreaElement).value).toBe(
    "Resolved",
  );
  expect(screen.getByText("SUSPENDED")).toBeTruthy();
});
