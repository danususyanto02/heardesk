import Link from "next/link";
import { FeedbackTracking } from "@/components/feedback-tracking";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lacak feedback | HearDesk",
  robots: { index: false, follow: false },
};

export default function TrackingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link className="brand" href="/">
          HearDesk
        </Link>
        <Link href="/docs">Panduan integrasi widget</Link>
      </header>
      <main className="public-docs tracking-page">
        <FeedbackTracking />
      </main>
    </div>
  );
}
