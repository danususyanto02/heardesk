import { describe, expect, it } from "vitest";
import { authorizeCompany } from "@/modules/companies/application/authorize-company";
import { can, permissions, type CompanyRole } from "@/modules/companies/domain/access";
import type { Actor } from "@/modules/identity/domain/session";

const actor: Actor = { userId: "alice", emailVerified: true, platformRole: "USER" };
const snapshot = { companyId: "company-x", userId: "alice", role: "OWNER" as const, status: "ACTIVE" as const };

describe("Company authorization", () => {
  const granted: Record<CompanyRole, readonly string[]> = {
    OWNER: permissions,
    ADMIN: ["company:read", "feedback:read", "feedback:status", "feedback:note", "sites:read", "sites:manage", "team:manage-non-owner", "usage:read"],
    AGENT: ["company:read", "feedback:read", "feedback:status", "feedback:note", "sites:read"],
    VIEWER: ["company:read", "feedback:read", "sites:read"],
  };
  for (const role of Object.keys(granted) as CompanyRole[]) {
    it(`${role} receives only its defined permissions`, () => {
      for (const permission of permissions) expect(can(role, permission)).toBe(granted[role].includes(permission));
    });
  }
  it("returns a frozen authorized scope bound to the requested Company and actor", () => {
    const result = authorizeCompany(actor, "company-x", snapshot, "feedback:read");
    expect(result).toMatchObject({ companyId: "company-x", actorId: "alice", role: "OWNER", permission: "feedback:read" });
    expect(Object.isFrozen(result)).toBe(true);
  });
  it("platform ownership grants no implicit Company membership", () => {
    expect(() => authorizeCompany({ ...actor, platformRole: "PLATFORM_OWNER" }, "company-x", null, "feedback:read")).toThrowError(expect.objectContaining({ code: "COMPANY_NOT_FOUND" }));
  });
  it("rejects snapshots for another user or another requested Company", () => {
    for (const wrong of [{ ...snapshot, userId: "bob" }, { ...snapshot, companyId: "company-y" }]) {
      expect(() => authorizeCompany(actor, "company-x", wrong, "feedback:read")).toThrowError(expect.objectContaining({ code: "COMPANY_NOT_FOUND" }));
    }
  });
  it("rejects unverified identities", () => {
    expect(() => authorizeCompany({ ...actor, emailVerified: false }, "company-x", snapshot, "feedback:read")).toThrowError(expect.objectContaining({ code: "EMAIL_NOT_VERIFIED" }));
  });
  it("rejects suspended Company membership", () => {
    expect(() => authorizeCompany(actor, "company-x", { ...snapshot, status: "SUSPENDED" }, "feedback:read")).toThrowError(expect.objectContaining({ code: "COMPANY_SUSPENDED" }));
  });
  it("does not reveal suspension to nonmembers", () => {
    expect(() => authorizeCompany(actor, "company-x", { ...snapshot, userId: "bob", status: "SUSPENDED" }, "feedback:read")).toThrowError(expect.objectContaining({ code: "COMPANY_NOT_FOUND" }));
  });
  it("denies Viewer writes and Admin ownership transfer", () => {
    for (const [role, permission] of [["VIEWER", "feedback:status"], ["ADMIN", "company:transfer"]] as const) {
      expect(() => authorizeCompany(actor, "company-x", { ...snapshot, role }, permission)).toThrowError(expect.objectContaining({ code: "COMPANY_FORBIDDEN" }));
    }
  });
  it("denies unknown runtime roles and permissions instead of defaulting to owner", () => {
    expect(can("invalid" as CompanyRole, "feedback:read")).toBe(false);
    expect(can("OWNER", "invalid" as typeof permissions[number])).toBe(false);
  });
});
