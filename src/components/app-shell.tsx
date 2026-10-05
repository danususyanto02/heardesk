"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
export function AppShell({ children, siteName }: { children: React.ReactNode; siteName: string }) {
  const path = usePathname(), router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function logout() { setBusy(true); try { await api("/api/auth/sign-out", { method: "POST", body: "{}" }); for (const key of Object.keys(sessionStorage)) if (key.startsWith("note-draft:")) sessionStorage.removeItem(key); router.replace("/login"); router.refresh(); } catch { setError("Keluar gagal. Coba lagi."); } finally { setBusy(false); } }
  return <><a className="skip-link" href="#content">Ke isi utama</a><header className="app-header"><Link className="brand" href="/inbox">uReport</Link><nav aria-label="Navigasi utama"><Link href="/inbox" aria-current={path.startsWith("/inbox") ? "page" : undefined}>Laporan</Link><Link href="/settings" aria-current={path === "/settings" ? "page" : undefined}>Website</Link></nav><span className="site-name">{siteName}</span><button className="btn quiet" onClick={logout} disabled={busy}>{busy ? "Keluar…" : "Keluar"}</button></header>{error && <p role="alert" className="shell-error">{error}</p>}<main id="content" className="workspace">{children}</main></>;
}
