import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { AuthForm } from "@/components/auth-form";
import { localSignupEnabled } from "@/modules/identity/infrastructure/signup-policy";
import { currentActor } from "@/server/auth";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (!(await db.installation.findUnique({ where: { id: 1 } }))) {
    redirect("/setup");
  }
  if (await currentActor()) {
    redirect("/dashboard");
  }
  return <AuthForm signupEnabled={localSignupEnabled(process.env)} />;
}
