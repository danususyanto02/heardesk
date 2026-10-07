import { config } from "dotenv";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { reconcileCompanyStorage } from "../src/modules/usage/infrastructure/prisma-storage-reconcile";
config({ quiet: true });
const { db } = await import("../src/server/db");
const root = path.resolve(process.env.STORAGE_DIR ?? "storage");
await mkdir(root, { recursive: true });
try {
  const result = await reconcileCompanyStorage(db, {
    async discard(key) {
      if (!/^[a-f0-9-]{36}\.webp$/.test(key)) throw new Error("Invalid storage key.");
      await unlink(path.join(root, key)).catch(error => { if (error.code !== "ENOENT") throw error; });
    },
    async list() {
      const files = [];
      for (const key of await readdir(root)) if (/^[a-f0-9-]{36}\.webp$/.test(key)) files.push({ key, modifiedAt: (await stat(path.join(root, key))).mtime });
      return files;
    },
  }, new Date());
  console.log(`Storage reconciliation complete. ${result.removed} orphan file(s) removed.`);
} finally { await db.$disconnect(); }
