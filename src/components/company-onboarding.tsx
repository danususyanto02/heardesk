"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { CompanySummary } from "@/modules/companies/domain/onboarding";

export function CompanyOnboarding({ companies }: { companies: readonly CompanySummary[] }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [key, setKey] = useState<string | null>(null);
  async function open(id: string) {
    setBusy(true); setError("");
    try { await api("/api/companies/active", { method: "POST", body: JSON.stringify({ companyId: id }) }); location.assign("/settings"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open Company."); setBusy(false); }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const idempotencyKey = key ?? crypto.randomUUID(); setKey(idempotencyKey);
    try { const company = await api<CompanySummary>("/api/companies", { method: "POST", body: JSON.stringify({ name: new FormData(event.currentTarget).get("name"), idempotencyKey }) }); await open(company.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Company creation failed. Retry with the same details."); setBusy(false); }
  }
  return <div className="auth-page"><a className="brand" href="/">HearDesk</a><section className="auth-panel"><h1>{companies.length ? "Choose your Company" : "Create your Company"}</h1><p className="muted">Each Company has its own websites, team, and feedback inbox.</p>
    {companies.length > 0 && <ul>{companies.map(company => <li key={company.id}><button className="btn quiet" disabled={busy || company.status !== "ACTIVE"} onClick={() => open(company.id)}>Open {company.name}</button>{company.status === "SUSPENDED" && <span>Suspended</span>}</li>)}</ul>}
    <form className="form-stack" onSubmit={create}><label>Company name<input name="name" required maxLength={120} onChange={() => { if (!busy) setKey(null); }}/></label>{error && <p className="error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy ? "Creating..." : "Create Company"}</button></form>
    <p><button className="btn quiet" disabled={busy} onClick={async () => { try { await api("/api/auth/sign-out", { method: "POST", body: "{}" }); location.assign("/login"); } catch { setError("Sign out failed. Try again."); } }}>Sign out</button></p>
  </section></div>;
}
