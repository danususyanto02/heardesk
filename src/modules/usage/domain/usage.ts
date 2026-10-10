import type { AuthorizedCompany } from "../../companies/domain/access";

export type CompanyLimits = Readonly<{
  websites: number;
  seats: number;
  monthlyReports: number;
  storageBytes: bigint;
}>;
export type CompanyUsageSnapshot = Readonly<{
  websiteCount: number;
  occupiedSeats: number;
  monthlyReportCount: number;
  storedBytes: bigint;
  reservedBytes: bigint;
  period: string;
}>;
export type ReportReservation = Readonly<{
  id: string;
  companyId: string;
  siteId: number;
  submissionId: string;
  period: string;
  expiresAt: string;
}>;
export interface Clock {
  now(): Date;
}
export interface UsageRepository {
  reserveReport(
    scope: AuthorizedCompany,
    siteId: number,
    submissionId: string,
    period: string,
  ): Promise<ReportReservation>;
  reserveUpload(scope: AuthorizedCompany, id: string, bytes: bigint): Promise<void>;
  commitReport(
    scope: AuthorizedCompany,
    reservation: ReportReservation,
    actualBytes: bigint,
  ): Promise<void>;
  release(scope: AuthorizedCompany, reservation: ReportReservation): Promise<void>;
  snapshot(scope: AuthorizedCompany): Promise<CompanyUsageSnapshot>;
  assertWebsiteCapacity(scope: AuthorizedCompany): Promise<void>;
  assertSeatCapacity(scope: AuthorizedCompany, email: string): Promise<void>;
}
export type StagedFile = Readonly<{
  id: string;
  key: string;
  size: number;
  mime: string;
  filename: string;
}>;
export interface UploadStore {
  stage(bytes: Uint8Array): Promise<StagedFile>;
  discard(stage: StagedFile): Promise<void>;
}
