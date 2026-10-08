export type PlatformQuery = Readonly<{ q: string; page: number; pageSize?: number }>;
export type PlatformPage<T> = Readonly<{ items: readonly T[]; total: number; page: number; pageSize: number }>;
export type PlatformOverview = Readonly<{ companies: number; activeCompanies: number; suspendedCompanies: number; users: number; websites: number; reports: number; storedBytes: string }>;
export type PlatformLimits = Readonly<{ websites: number; seats: number; monthlyReports: number; storageBytes: string }>;
export type PlatformCompany = Readonly<{ id: string; name: string; status: "ACTIVE" | "SUSPENDED"; reason: string | null; createdAt: string; updatedAt: string; owners: readonly { id: string; name: string; email: string }[]; members: number;occupiedSeats?:number; websites: number; reports: number; monthlyReports: number; period: string; storedBytes: string; limits: PlatformLimits }>;
export type PlatformUser = Readonly<{ id: string; name: string; email: string; emailVerified: boolean; platformRole: "USER" | "PLATFORM_OWNER"; accountStatus?:string;membershipCount?:number; createdAt: string; companies: readonly { id: string; name: string; role: string }[] }>;
export type PlatformAudit = Readonly<{ id: string; actorId: string; companyId: string | null; companyName: string | null; action: string; resourceId: string; reason: string | null; createdAt: string }>;
export type StatusChange = Readonly<{ status: "ACTIVE" | "SUSPENDED"; reason: string; expectedUpdatedAt: string }>;
export type LimitsChange = PlatformLimits & Readonly<{ reason: string; expectedUpdatedAt: string }>;
export interface PlatformRepository {
  overview(actorId: string): Promise<PlatformOverview>;
  companies(actorId: string, query: PlatformQuery): Promise<PlatformPage<PlatformCompany>>;
  company(actorId: string, id: string): Promise<PlatformCompany>;
  users(actorId: string, query: PlatformQuery): Promise<PlatformPage<PlatformUser>>;
  audit(actorId: string, query: PlatformQuery): Promise<PlatformPage<PlatformAudit>>;
  setStatus(actorId: string, id: string, input: StatusChange): Promise<PlatformCompany>;
  setLimits(actorId: string, id: string, input: LimitsChange): Promise<PlatformCompany>;
}
