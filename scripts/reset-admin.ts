import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
config({ quiet: true });
const password = process.env.UREPORT_NEW_PASSWORD;
if (!password || password.length < 15 || password.length > 128) throw new Error("Provide UREPORT_NEW_PASSWORD with 15–128 characters in the operator environment.");
const { db } = await import("../src/server/db");
const hashed = await hashPassword(password);
await db.$transaction(async tx => {
  const install = await tx.installation.findUniqueOrThrow({ where: { id: 1 } });
  const updated = await tx.account.updateMany({ where: { userId: install.adminId, providerId: "credential" }, data: { password: hashed } });
  if (updated.count !== 1) throw new Error("Credential account unavailable.");
  await tx.session.deleteMany({ where: { userId: install.adminId } });
});
console.log("Admin password reset. Existing sessions revoked.");
await db.$disconnect();
