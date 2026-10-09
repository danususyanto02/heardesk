import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { AuthForm } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function Setup() {
  if (await db.installation.findUnique({ where: { id: 1 } })) {
    redirect("/login");
  }
  return <AuthForm setup />;
}
