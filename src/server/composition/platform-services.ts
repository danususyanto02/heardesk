import type { PrismaClient } from "@/generated/prisma/client";
import type { SessionReader } from "@/modules/identity/domain/session";
import { platformDashboard } from "@/modules/platform/application/platform-dashboard";
import { prismaPlatformRepository } from "@/modules/platform/infrastructure/prisma-platform-repository";
export function createPlatformServices(db: PrismaClient, session: SessionReader) { return platformDashboard(prismaPlatformRepository(db), session); }
