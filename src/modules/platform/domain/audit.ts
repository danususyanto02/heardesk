export type AuditAction =
  | "PLATFORM_BOOTSTRAPPED"
  | "WEBSITE_KEY_ROTATED"
  | "MEMBER_INVITED"
  | "INVITATION_REVOKED"
  | "INVITATION_ACCEPTED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_REMOVED"
  | "OWNERSHIP_TRANSFERRED"
  | "COMPANY_SUSPENDED"
  | "COMPANY_REACTIVATED"
  | "COMPANY_LIMITS_CHANGED";
export type AuditEvent = Readonly<{
  actorId: string;
  companyId: string | null;
  action: AuditAction;
  resourceId: string;
  createdAt: string;
  metadata?: Readonly<{ reason?: string; previousRole?: string; newRole?: string }>;
}>;
export interface AuditWriter {
  append(event: AuditEvent): Promise<void>;
}
