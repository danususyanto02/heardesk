import type { Actor } from "../../identity/domain/session";
export type CompanySummary = Readonly<{
  id: string;
  name: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
}>;
export type CompanyCreationInput = Readonly<{ name: string; idempotencyKey: string }>;
export interface CompanyOnboardingRepository {
  create(actor: Actor, input: CompanyCreationInput): Promise<CompanySummary>;
  list(actor: Actor): Promise<readonly CompanySummary[]>;
}
