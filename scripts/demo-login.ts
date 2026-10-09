import type { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

export async function enableDemoLogin(db: PrismaClient, ownerId: string, password: string) {
  if (password.length < 15 || password.length > 128) {
    throw new Error("Demo password must contain 15 to 128 characters.");
  }
  const hash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(178240)`;
    const owner = await tx.user.findUnique({ where: { id: ownerId } });
    if (owner?.platformRole !== "PLATFORM_OWNER" || !owner.emailVerified) {
      throw new Error("Verified Platform Owner required.");
    }
    const company = await tx.organization.findUniqueOrThrow({
      where: { id: "heardesk-demo-northstar" },
    });
    if (JSON.parse(company.metadata ?? "null")?.seed !== "heardesk-demo-v1") {
      throw new Error("Company is not the managed demo dataset.");
    }
    const user = await tx.user.findUniqueOrThrow({
      where: { id: "heardesk-demo-northstar-admin" },
    });
    const member = await tx.member.findUnique({
      where: { organizationId_userId: { organizationId: company.id, userId: user.id } },
    });
    if (
      user.email !== "admin@northstar.example.test" ||
      user.platformRole !== "USER" ||
      member?.role !== "ADMIN"
    ) {
      throw new Error("Demo identity or membership differs from expected seed.");
    }
    if (await tx.account.findFirst({ where: { userId: user.id, providerId: "credential" } })) {
      return { created: false, email: user.email };
    }
    await tx.account.create({
      data: {
        id: "heardesk-demo-northstar-admin-credential",
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hash,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    return { created: true, email: user.email };
  });
}
