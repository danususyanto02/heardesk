import { ClientAuth } from "@/components/client-auth";
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) { return <ClientAuth mode="reset" token={(await searchParams).token}/>; }
