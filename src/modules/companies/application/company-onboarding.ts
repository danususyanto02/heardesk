import type { Actor } from "../../identity/domain/session";
import type { CompanyOnboardingRepository, CompanyCreationInput } from "../domain/onboarding";
import { CompanyAccessError } from "../domain/access";

export function companyOnboarding(repository: CompanyOnboardingRepository) {
  return {
    create(actor: Actor, input: CompanyCreationInput) {
      if (!actor.emailVerified) throw new CompanyAccessError("EMAIL_NOT_VERIFIED");
      const name = input.name.trim();
      if (name.length < 1 || name.length > 120 || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) throw Object.assign(new Error("Check Company name and creation key"), { code: "COMPANY_INPUT_INVALID" });
      return repository.create(actor, { name, idempotencyKey: input.idempotencyKey });
    },
    list(actor: Actor) {
      if (!actor.emailVerified) throw new CompanyAccessError("EMAIL_NOT_VERIFIED");
      return repository.list(actor);
    },
  };
}
