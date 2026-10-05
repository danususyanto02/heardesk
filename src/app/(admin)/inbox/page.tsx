import { Suspense } from "react";
import { Inbox } from "@/components/inbox";
export default function InboxPage() { return <Suspense fallback={<p>Memuat feedback…</p>}><Inbox/></Suspense>; }
