import { ClientAuth } from "@/components/client-auth";
export default async function ResetPassword({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ token?: string }>;
}>) {
  return <ClientAuth mode="reset" token={(await searchParams).token} />;
}
