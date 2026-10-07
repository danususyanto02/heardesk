import type { PrismaClient } from "@/generated/prisma/client";
import { companyOnboarding } from "@/modules/companies/application/company-onboarding";
import { prismaOnboarding, type DefaultCompanyLimits } from "@/modules/companies/infrastructure/prisma-onboarding";
export function createCompanyOnboarding(db: PrismaClient, limits: DefaultCompanyLimits) { return companyOnboarding(prismaOnboarding(db, limits)); }
