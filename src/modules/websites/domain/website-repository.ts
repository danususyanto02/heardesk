import type { AuthorizedCompany } from "../../companies/domain/access";

export type WebsiteInput = Readonly<{
  name: string;
  origin: string;
  buttonLabel: string;
  position: "left" | "right";
}>;
export type WebsiteDto = WebsiteInput &
  Readonly<{ id: number; companyId: string; publicKey: string }>;
export type RotationResult =
  | Readonly<{ status: "rotated"; website: WebsiteDto }>
  | Readonly<{ status: "not-found" | "stale" }>;
export interface WebsiteRepository {
  list(scope: AuthorizedCompany): Promise<readonly WebsiteDto[]>;
  find(scope: AuthorizedCompany, siteId: number): Promise<WebsiteDto | null>;
  update(scope: AuthorizedCompany, siteId: number, input: WebsiteInput): Promise<WebsiteDto | null>;
  rotate(
    scope: AuthorizedCompany,
    siteId: number,
    expectedKey: string,
    newKey: string,
  ): Promise<RotationResult>;
}
export interface WebsiteCreator {
  create(scope: AuthorizedCompany, input: WebsiteInput): Promise<WebsiteDto>;
}
export interface WidgetResolver {
  resolve(publicKey: string): Promise<WebsiteDto | null>;
}
