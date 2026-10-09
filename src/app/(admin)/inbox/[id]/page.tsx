import { Detail } from "@/components/detail";
export default async function DetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}>) {
  const { id } = await params;
  const query = await searchParams;
  const back =
    query.return?.startsWith("/inbox?") || query.return === "/inbox" ? query.return : "/inbox";
  return <Detail id={id} back={back ?? "/inbox"} />;
}
