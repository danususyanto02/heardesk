import { requireActor } from "./auth";
import { db } from "./db";
import { createCompanyServices } from "./composition/company-services";

export { feedbackQueryInput } from "./feedback-query";
export async function companyApi(request: Request, companyId: string) {
  return {
    actor: await requireActor(request.headers),
    companyId,
    services: createCompanyServices(db),
  };
}
