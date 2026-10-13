import { createHash } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  demoAccounts,
  demoCompanyId,
  demoSeed,
  type PublicDemoAccess,
} from "@/modules/identity/domain/demo-accounts";
import { publicDemoConfig } from "@/modules/identity/infrastructure/demo-config";

const passwordChecks = new Map<string, Promise<boolean>>();

function demoPasswordMatches(hash: string, password: string) {
  const key = createHash("sha256").update(hash).update("\0").update(password).digest("hex");
  const cached = passwordChecks.get(key);
  if (cached) {
    return cached;
  }
  if (passwordChecks.size >= demoAccounts.length * 2) {
    passwordChecks.clear();
  }
  const check = verifyPassword({ hash, password }).catch(() => false);
  passwordChecks.set(key, check);
  return check;
}

export async function publishedDemoAccounts(
  db: PrismaClient,
  values: Record<string, string | undefined>,
): Promise<PublicDemoAccess | null> {
  const config = publicDemoConfig(values);
  if (!config) {
    return null;
  }
  const company = await db.organization.findUnique({
    where: { id: demoCompanyId },
    select: { metadata: true, profile: { select: { status: true } } },
  });
  if (company?.profile?.status !== "ACTIVE") {
    return null;
  }
  try {
    if (JSON.parse(company.metadata ?? "null")?.seed !== demoSeed) {
      return null;
    }
  } catch {
    return null;
  }
  const definitions = demoAccounts.filter(
    (account) => account.platformRole !== "PLATFORM_OWNER" || config.platformOwner,
  );
  const users = await db.user.findMany({
    where: { id: { in: definitions.map((account) => account.id) } },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      accountStatus: true,
      platformRole: true,
      memberships: { select: { organizationId: true, role: true } },
      accounts: {
        where: { providerId: "credential" },
        select: { id: true, accountId: true, password: true },
      },
    },
  });
  const accounts: PublicDemoAccess["accounts"][number][] = [];
  for (const definition of definitions) {
    const user = users.find((candidate) => candidate.id === definition.id);
    const credential = user?.accounts[0];
    const membership = user?.memberships[0];
    if (
      !user?.emailVerified ||
      user.accountStatus !== "ACTIVE" ||
      user.email !== definition.email ||
      user.platformRole !== definition.platformRole ||
      user.memberships.length !== 1 ||
      membership?.organizationId !== demoCompanyId ||
      membership.role !== definition.companyRole ||
      user.accounts.length !== 1 ||
      credential?.id !== definition.id + "-credential" ||
      credential.accountId !== definition.id ||
      !credential.password
    ) {
      continue;
    }
    if (await demoPasswordMatches(credential.password, config.password)) {
      const { id, label, email, description } = definition;
      accounts.push({ id, label, email, description });
    }
  }
  return accounts.length ? { password: config.password, accounts } : null;
}
