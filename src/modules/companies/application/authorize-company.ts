import type { Actor } from "../../identity/domain/session";
import {
  can,
  CompanyAccessError,
  type AccessSnapshot,
  type AuthorizedCompany,
  type CompanyId,
  type Permission,
} from "../domain/access";

export function authorizeCompany(
  actor: Actor,
  companyId: CompanyId,
  snapshot: AccessSnapshot | null,
  permission: Permission,
): AuthorizedCompany {
  if (!actor.emailVerified) {
    throw new CompanyAccessError("EMAIL_NOT_VERIFIED");
  }
  if (snapshot?.userId !== actor.userId || snapshot?.companyId !== companyId) {
    throw new CompanyAccessError("COMPANY_NOT_FOUND");
  }
  if (snapshot.status !== "ACTIVE") {
    throw new CompanyAccessError("COMPANY_SUSPENDED");
  }
  if (!can(snapshot.role, permission)) {
    throw new CompanyAccessError("COMPANY_FORBIDDEN");
  }
  return Object.freeze({
    companyId,
    actorId: actor.userId,
    role: snapshot.role,
    permission,
  }) as AuthorizedCompany;
}
