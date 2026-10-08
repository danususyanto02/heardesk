import type { PrismaClient } from "@/generated/prisma/client";
import type { SessionReader } from "@/modules/identity/domain/session";
import { platformUsers } from "@/modules/platform/application/platform-users";
import { prismaUserOperations } from "@/modules/platform/infrastructure/prisma-user-operations";
export function createPlatformUsers(db: PrismaClient, session: SessionReader) { return platformUsers(prismaUserOperations(db),session); }
