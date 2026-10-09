"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
export function AppShell({
  children,
  siteName,
  companyId,
}: Readonly<{
  children: React.ReactNode;
  siteName: string;
  companyId?: string;
}>) {
  const path = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/sign-out", { method: "POST", body: "{}" });
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("note-draft:")) {
          sessionStorage.removeItem(key);
        }
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Keluar gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  const suffix = companyId ? "?company=" + encodeURIComponent(companyId) : "";
  return (
    <>
      <a className="skip-link" href="#content">
        Ke isi utama
      </a>
      <header className="app-header">
        <Link className="brand" href={"/inbox" + suffix}>
          HearDesk
        </Link>
        <nav aria-label="Navigasi utama">
          <Link
            href={"/inbox" + suffix}
            aria-current={path.startsWith("/inbox") ? "page" : undefined}
          >
            Laporan
          </Link>
          <Link
            href={"/settings" + suffix}
            aria-current={path === "/settings" ? "page" : undefined}
          >
            Website
          </Link>
        </nav>
        <span className="site-name">{siteName}</span>
        <div className="company-header-actions">
          <Link className="btn" href="/companies">
            Switch Company
          </Link>
          <button className="btn quiet" onClick={logout} disabled={busy}>
            {busy ? "Keluar…" : "Keluar"}
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="shell-error">
          {error}
        </p>
      )}
      <main id="content" className="workspace">
        {children}
      </main>
    </>
  );
}
