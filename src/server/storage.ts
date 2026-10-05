import sharp from "sharp";
import { mkdir, statfs, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
import { storageAdmission } from "./storage-admission";
const MAX_FILE = 5 * 1024 * 1024;
const RESERVE = MAX_FILE * 2;
let decoding = 0;
export async function normalizeImage(buffer: Buffer) {
  if (buffer.length > MAX_FILE) throw new HttpError(413, "Screenshot maksimal 5 MiB.");
  if (decoding >= 2) throw new HttpError(503, "Pemrosesan gambar sedang sibuk. Coba lagi.");
  const png = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  const webp = buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (!png && !jpeg && !webp) throw new HttpError(415, "Gunakan PNG, JPEG, atau WebP.");
  if (png) {
    let offset = 8;
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset), chunk = buffer.subarray(offset + 4, offset + 8).toString();
      if (length > buffer.length - offset - 12) throw new HttpError(415, "PNG tidak valid.");
      if (chunk === "acTL") throw new HttpError(415, "Animasi tidak didukung. Gunakan screenshot statis.");
      offset += length + 12;
      if (chunk === "IEND") break;
    }
  }
  decoding++;
  try {
    const image = sharp(buffer, { limitInputPixels: 20000000, failOn: "warning" });
    const info = await image.metadata();
    if (!info.width || !info.height || (info.pages ?? 1) > 1 || info.width * info.height > 20000000) throw new Error("image bounds");
    const result = await image.rotate().webp({ quality: 85 }).timeout({ seconds: 10 }).toBuffer();
    if (result.length > MAX_FILE) throw new HttpError(413, "Hasil screenshot terlalu besar.");
    return result;
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(415, "Gambar rusak atau melebihi batas 20 megapixel."); }
  finally { decoding--; }
}
function storagePath(key: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) throw new HttpError(404, "Lampiran tidak ditemukan.");
  return path.join(path.resolve(env().STORAGE_DIR), key);
}
export async function stageAttachment(file: File) {
  const config = env(), id = randomUUID(), key = id + ".webp";
  await mkdir(config.STORAGE_DIR, { recursive: true, mode: 0o700 });
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(178232)`;
    const used = await tx.storageBudget.findUniqueOrThrow({ where: { id: 1 } });
    const reserved = await tx.uploadReservation.aggregate({ _sum: { bytes: true } });
    const disk = await statfs(config.STORAGE_DIR);
    if (!storageAdmission({ free: disk.bavail * disk.bsize, floor: config.MIN_FREE_BYTES, reserved: Number(reserved._sum.bytes ?? 0), needed: RESERVE, used: Number(used.used), quota: config.STORAGE_QUOTA_BYTES })) throw new HttpError(503, "Kapasitas screenshot tidak mencukupi.", "UPLOAD_CAPACITY_UNAVAILABLE");
    await tx.uploadReservation.create({ data: { id, bytes: RESERVE } });
  });
  try {
    const output = await normalizeImage(Buffer.from(await file.arrayBuffer()));
    await writeFile(storagePath(key), output, { flag: "wx", mode: 0o600 });
    return { id, key, size: output.length, mime: "image/webp", filename: "screenshot.webp" };
  } catch (error) { await discardAttachment(id, key); throw error; }
}
export async function discardAttachment(id: string, key: string) {
  await unlink(storagePath(key)).catch(error => { if (error.code !== "ENOENT") throw error; });
  await db.uploadReservation.deleteMany({ where: { id } });
}
export async function attachmentBytes(key: string) { try { return await readFile(storagePath(key)); } catch { throw new HttpError(404, "Lampiran tidak tersedia."); } }
