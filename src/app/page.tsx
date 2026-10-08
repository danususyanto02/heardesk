import type { Metadata } from "next";
import { db } from "@/server/db";
import { Landing } from "@/components/landing";
import {localSignupEnabled} from "@/modules/identity/infrastructure/signup-policy";
import {currentActor} from "@/server/auth";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "uReport · Feedback website di server sendiri", description: "Terima laporan masalah, saran, dan pujian dari pengunjung melalui widget. Kelola pesan dan screenshot dalam inbox privat pada server sendiri." };
export default async function Home() {
  const installed = !!await db.installation.findUnique({ where: { id: 1 } });
  const actor=installed?await currentActor():null;
  return <Landing installed={installed} signupEnabled={localSignupEnabled(process.env)} authenticated={!!actor}/>;
}
