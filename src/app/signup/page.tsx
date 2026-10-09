import { ClientAuth } from "@/components/client-auth";
import { localSignupEnabled } from "@/modules/identity/infrastructure/signup-policy";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
export const dynamic = "force-dynamic";
export default async function Signup() {
  if (
    !localSignupEnabled(process.env) ||
    !(await db.installation.findUnique({ where: { id: 1 } }))
  ) {
    notFound();
  }
  return <ClientAuth mode="signup" />;
}
