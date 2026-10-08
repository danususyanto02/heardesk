import { Suspense } from "react";
import { Inbox } from "@/components/inbox";
import {InboxPageSkeleton} from "@/components/skeleton";
export default function InboxPage() { return <Suspense fallback={<InboxPageSkeleton/>}><Inbox/></Suspense>; }
