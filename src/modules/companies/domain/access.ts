export type CompanyRole = "OWNER" | "ADMIN" | "AGENT" | "VIEWER";
export const permissions = [
  "company:read",
  "company:settings",
  "company:transfer",
  "feedback:read",
  "feedback:status",
  "feedback:note",
  "sites:read",
  "sites:manage",
  "team:manage-non-owner",
  "usage:read",
] as const;
export type Permission = (typeof permissions)[number];
export type AccessSnapshot = Readonly<{
  companyId: string;
  userId: string;
  role: CompanyRole;
  status: "ACTIVE" | "SUSPENDED";
}>;

declare const authorizedCompany: unique symbol;
export type AuthorizedCompany = Readonly<{
  companyId: string;
  actorId: string;
  role: CompanyRole;
  permission: Permission;
  [authorizedCompany]: true;
}>;

export type CompanyErrorCode =
  | "UNAUTHENTICATED"
  | "EMAIL_NOT_VERIFIED"
  | "COMPANY_NOT_FOUND"
  | "COMPANY_SUSPENDED"
  | "COMPANY_FORBIDDEN"
  | "RESOURCE_NOT_FOUND";
export class CompanyAccessError extends Error {
  constructor(public readonly code: CompanyErrorCode) {
    super(code);
    this.name = "CompanyAccessError";
  }
}

const grants: Readonly<Record<CompanyRole, readonly Permission[]>> = {
  OWNER: permissions,
  ADMIN: [
    "company:read",
    "feedback:read",
    "feedback:status",
    "feedback:note",
    "sites:read",
    "sites:manage",
    "team:manage-non-owner",
    "usage:read",
  ],
  AGENT: ["company:read", "feedback:read", "feedback:status", "feedback:note", "sites:read"],
  VIEWER: ["company:read", "feedback:read", "sites:read"],
};
export function can(role: CompanyRole, permission: Permission): boolean {
  return Object.hasOwn(grants, role) && grants[role].includes(permission);
}
