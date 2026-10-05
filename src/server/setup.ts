import { randomUUID, timingSafeEqual } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { setupInput } from "@/lib/validation";
import { db } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
export async function bootstrap(input: unknown) {
  const data = setupInput.parse(input), expected = Buffer.from(env().UREPORT_SETUP_TOKEN), provided = Buffer.from(data.token);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new HttpError(403, "Kode aktivasi instalasi tidak valid.");
  if (await db.installation.findUnique({ where: { id: 1 } })) throw new HttpError(409, "Setup sudah selesai.");
  const password = await hashPassword(data.password);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(178231)`;
    if (await tx.installation.findUnique({ where: { id: 1 } })) throw new HttpError(409, "Setup sudah selesai.");
    const id = randomUUID();
    await tx.user.create({ data: { id, name: data.name, email: data.email, emailVerified: true } });
    await tx.account.create({ data: { id: randomUUID(), userId: id, accountId: id, providerId: "credential", password } });
    await tx.storageBudget.create({ data: { id: 1 } });
    await tx.installation.create({ data: { id: 1, adminId: id } });
    return { success: true };
  });
}
