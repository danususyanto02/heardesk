import { ClientAuth } from "@/components/client-auth";
export const dynamic = "force-dynamic";
export default async function VerifyEmail({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ verified?: string; error?: string }>;
}>) {
  const query = await searchParams;
  return (
    <ClientAuth
      mode="verify"
      verified={query.verified === "1" && !query.error}
      verificationError={
        query.error ? "Verification link is invalid or expired. Request a new link." : undefined
      }
    />
  );
}
