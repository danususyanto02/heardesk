import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { requirePlatformOwner } from "@/modules/identity/application/require-platform-owner";
import { PlatformShell } from "@/components/platform-shell";
import { HttpError } from "@/server/http";
export const dynamic = "force-dynamic";
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  try { await requirePlatformOwner({ current: () => requireActor() }); }
  catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    if (error instanceof Error && "code" in error && ["PLATFORM_FORBIDDEN", "EMAIL_NOT_VERIFIED"].includes(String(error.code))) redirect("/dashboard");
    throw error;
  }
  return <PlatformShell>{children}</PlatformShell>;
}
