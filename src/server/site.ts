import { randomBytes } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./http";
import { connectSiteInput, rotateKeyInput } from "@/lib/validation";

export async function connectSite(input: unknown) {
  const { address } = connectSiteInput.parse(input);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(178233)`;
    if (await tx.site.findUnique({ where: { id: 1 } })) throw new HttpError(409, "Website sudah terhubung. Muat ulang pengaturan.");
    return tx.site.create({ data: { id: 1, name: new URL(address).host, origin: address, publicKey: randomBytes(24).toString("base64url") } });
  });
}

export async function rotateWidgetKey(input: unknown) {
  const { expectedKey } = rotateKeyInput.parse(input);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(178233)`;
    const site = await tx.site.findUnique({ where: { id: 1 } });
    if (!site) throw new HttpError(409, "Hubungkan website terlebih dahulu.");
    if (site.publicKey !== expectedKey) throw new HttpError(409, "Key sudah berubah. Muat ulang sebelum mencoba lagi.");
    return tx.site.update({ where: { id: 1 }, data: { publicKey: randomBytes(24).toString("base64url") } });
  });
}
