"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function PlatformShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="platform-shell">
      <a className="skip-link" href="#platform-content">
        Skip to content
      </a>
      <header className="platform-header">
        <Link className="brand" href="/platform/overview">
          HearDesk
        </Link>
        <span className="platform-context">Platform Admin</span>
        <div className="platform-header-actions">
          <Link className="btn quiet" href="/companies">
            Open Company Dashboard
          </Link>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api("/api/auth/sign-out", { method: "POST", body: "{}" });
                location.assign("/login");
              } catch {
                setError("Sign out failed. Try again.");
                setBusy(false);
              }
            }}
          >
            {busy ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>
      <div className="platform-body">
        <aside className="platform-sidebar">
          <nav aria-label="Platform navigation">
            {[
              ["overview", "Overview"],
              ["companies", "Companies"],
              ["users", "Users"],
              ["usage", "Usage"],
              ["audit", "Audit Log"],
            ].map(([route, label]) => (
              <Link
                key={route}
                href={`/platform/${route}`}
                aria-current={
                  pathname === `/platform/${route}` ||
                  (route === "companies" && pathname.startsWith("/platform/companies/"))
                    ? "page"
                    : undefined
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="helper">
            Manage the service and client accounts. Customer feedback stays in Company dashboards.
          </p>
        </aside>
        <main id="platform-content" className="platform-content">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
