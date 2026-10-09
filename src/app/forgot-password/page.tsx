import { ClientAuth } from "@/components/client-auth";
export const dynamic = "force-dynamic";
export default function ForgotPassword() {
  return <ClientAuth mode="forgot" />;
}
