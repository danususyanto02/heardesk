import { config } from "dotenv";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
config({ quiet: true });
const { db } = await import("../src/server/db");
const root = path.resolve(process.env.STORAGE_DIR ?? "storage");
await mkdir(root, { recursive: true });
let removed = 0;
await db.$transaction(async tx => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(178232)`;
  const attached = await tx.attachment.findMany({ select: { key: true, size: true } });
  const keys = new Set(attached.map(item => item.key));
  const reservations = await tx.uploadReservation.findMany();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const reservation of reservations) {
    if (reservation.createdAt.getTime() >= cutoff) continue;
    const key = reservation.id + ".webp";
    if (!keys.has(key)) await unlink(path.join(root, key)).catch(error => { if (error.code !== "ENOENT") throw error; });
    await tx.uploadReservation.delete({ where: { id: reservation.id } });
  }
  const live = new Set((await tx.uploadReservation.findMany({ select: { id: true } })).map(item => item.id + ".webp"));
  for (const key of await readdir(root)) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(key) || keys.has(key) || live.has(key)) continue;
    const file = await stat(path.join(root, key));
    if (file.mtimeMs < cutoff) { await unlink(path.join(root, key)); removed++; }
  }
  await tx.storageBudget.upsert({ where: { id: 1 }, create: { id: 1, used: attached.reduce((sum, item) => sum + BigInt(item.size), BigInt(0)) }, update: { used: attached.reduce((sum, item) => sum + BigInt(item.size), BigInt(0)) } });
}, { timeout: 60000 });
console.log(`Storage reconciliation complete. ${removed} orphan file(s) removed.`);
await db.$disconnect();
