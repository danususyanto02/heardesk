import { expect, it } from "vitest";
import { createOrganizationBoundary } from "@/modules/companies/infrastructure/auth-organization-policy";

it("blocks direct organization mutation before any database handler runs", async () => {
  let reached = 0;
  const handle = createOrganizationBoundary(async () => {
    reached++;
    return new Response("ok");
  });
  for (const endpoint of [
    "create",
    "add-member",
    "remove-member",
    "leave",
    "update-member-role",
    "invite-member",
    "accept-invitation",
    "cancel-invitation",
    "delete",
    "set-active",
    "create-role",
  ]) {
    const response = await handle(
      new Request(`http://localhost:3000/api/auth/organization/${endpoint}`, { method: "POST" }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ORGANIZATION_MUTATION_DISABLED" });
  }
  expect(reached).toBe(0);
});
it("preserves non-organization authentication requests", async () => {
  const handle = createOrganizationBoundary(async () => new Response("session", { status: 200 }));
  expect(
    await (await handle(new Request("http://localhost:3000/api/auth/get-session"))).text(),
  ).toBe("session");
});
it("does not expose organization reads before scoped adapters are installed", async () => {
  const handle = createOrganizationBoundary(async () => new Response("leaked"));
  const response = await handle(
    new Request(
      "http://localhost:3000/api/auth/organization/get-full-organization?organizationId=foreign",
    ),
  );
  expect(response.status).toBe(403);
});
