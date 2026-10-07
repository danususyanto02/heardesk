import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { EmailSender } from "../domain/email";

export function createLocalEmailSender(directory: string): EmailSender {
  const root = path.resolve(directory);
  return { async send(message) {
    await mkdir(root, { recursive: true, mode: 0o700 });
    await writeFile(path.join(root, randomUUID() + ".json"), JSON.stringify({ ...message, createdAt: new Date().toISOString(), delivery: "local-only" }, null, 2), { flag: "wx", mode: 0o600 });
  } };
}
