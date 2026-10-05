import { it, expect } from "vitest";
import sharp from "sharp";
import { normalizeImage } from "../src/server/storage";
it("rejects non-image and SVG payloads", async () => {
  await expect(normalizeImage(Buffer.from("not an image"))).rejects.toThrow();
  await expect(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="5" height="5"></svg>'))).rejects.toThrow();
});
it("normalizes allowed image and drops metadata", async () => {
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).png().withMetadata().toBuffer();
  const result = await normalizeImage(png), info = await sharp(result).metadata();
  expect(info.format).toBe("webp"); expect(info.exif).toBeUndefined(); expect(info.width).toBe(10);
});
it("rejects PNG animation control chunks", async () => {
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).png().toBuffer();
  const chunk = Buffer.alloc(20); chunk.writeUInt32BE(8, 0); chunk.write("acTL", 4); chunk.writeUInt32BE(2, 8);
  const animated = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
  await expect(normalizeImage(animated)).rejects.toThrow("Animasi");
});
