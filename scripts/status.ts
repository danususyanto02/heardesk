import { config } from "dotenv";
config({ quiet: true });
const { db } = await import("../src/server/db");
console.log({
  installations: await db.installation.count(),
  users: await db.user.count(),
  feedback: await db.feedback.count(),
});
await db.$disconnect();
