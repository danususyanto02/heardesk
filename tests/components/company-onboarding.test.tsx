// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CompanyOnboarding } from "@/components/company-onboarding";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("reuses creation identity on retry and rotates it after name edits", async () => {
  const payloads: { name: string; idempotencyKey: string }[] = [];
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    payloads.push(JSON.parse(options.body as string));
    return Response.json({ error: { message: "Try later" } }, { status: 503 });
  });
  render(<CompanyOnboarding companies={[]} />);
  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Team X" } });
  for (let attempt = 0; attempt < 2; attempt++) {
    fireEvent.click(screen.getByRole("button", { name: "Create Company" }));
    await screen.findByRole("alert");
  }
  expect(payloads[0].idempotencyKey).toBe(payloads[1].idempotencyKey);
  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Team Y" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Company" }));
  await screen.findByRole("alert");
  expect(payloads[2].idempotencyKey).not.toBe(payloads[1].idempotencyKey);
  expect(payloads[2].name).toBe("Team Y");
});

it("allows active Company selection, denies suspended selection and preserves failure recovery", async () => {
  let submitted: unknown;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    submitted = JSON.parse(options.body as string);
    return Response.json({ error: { message: "Membership revoked" } }, { status: 403 });
  });
  render(
    <CompanyOnboarding
      companies={[
        { id: "x", name: "Team X", role: "OWNER", status: "ACTIVE" },
        { id: "y", name: "Team Y", role: "ADMIN", status: "SUSPENDED" },
      ]}
    />,
  );
  const radios = screen.getAllByRole("radio");
  expect((radios[1] as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(radios[0]);
  fireEvent.click(screen.getByRole("button", { name: "Open selected Company" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Membership revoked");
  expect(submitted).toEqual({ companyId: "x" });
  fireEvent.click(screen.getByRole("button", { name: "Create another Company" }));
  expect(screen.getByLabelText("Company name")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel new Company" }));
  expect(screen.queryByLabelText("Company name")).toBeNull();
});

it("surfaces sign-out failure", async () => {
  vi.stubGlobal("fetch", async () => Response.json({}, { status: 503 }));
  render(<CompanyOnboarding companies={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Sign out failed. Try again.");
});
