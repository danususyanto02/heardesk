"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { CompanySummary } from "@/modules/companies/domain/onboarding";

export function CompanyOnboarding({
  companies,
}: Readonly<{ companies: readonly CompanySummary[] }>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(companies.length === 0);
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/companies/active", {
        method: "POST",
        body: JSON.stringify({ companyId: id }),
      });
      location.assign("/settings?company=" + encodeURIComponent(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open Company.");
      setBusy(false);
    }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const idempotencyKey = key ?? crypto.randomUUID();
    setKey(idempotencyKey);
    try {
      const company = await api<CompanySummary>("/api/companies", {
        method: "POST",
        body: JSON.stringify({
          name: new FormData(event.currentTarget).get("name"),
          idempotencyKey,
        }),
      });
      await open(company.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Company creation failed. Retry with the same details.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <a className="brand" href="/">
        HearDesk
      </a>
      <section className="auth-panel">
        <h1>{companies.length ? "Choose your Company" : "Create your Company"}</h1>
        <p className="muted">Each Company has its own websites, team, and feedback inbox.</p>
        {companies.length > 0 && (
          <>
            <div className="company-choices" role="radiogroup" aria-label="Choose Company">
              {companies.map((company) => (
                <label
                  className={`company-choice ${selected === company.id ? "selected" : ""}`}
                  key={company.id}
                >
                  <input
                    type="radio"
                    name="company"
                    value={company.id}
                    checked={selected === company.id}
                    disabled={busy || company.status !== "ACTIVE"}
                    onChange={() => setSelected(company.id)}
                  />
                  <span>
                    <strong>{company.name}</strong>
                    <span className="helper">
                      {company.role} · {company.status === "ACTIVE" ? "Active" : "Suspended"}
                    </span>
                  </span>
                  {selected === company.id && <span className="company-selected">Selected</span>}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="btn primary full"
              disabled={busy || !selected}
              onClick={() => selected && open(selected)}
            >
              {busy ? "Opening Company..." : "Open selected Company"}
            </button>
            <button
              type="button"
              className="btn quiet"
              disabled={busy}
              onClick={() => setCreating(!creating)}
            >
              {creating ? "Cancel new Company" : "Create another Company"}
            </button>
          </>
        )}
        {creating && (
          <form className="form-stack" onSubmit={create}>
            <label>
              Company name
              <input
                name="name"
                required
                maxLength={120}
                onChange={() => {
                  if (!busy) {
                    setKey(null);
                  }
                }}
              />
            </label>
            <p className="helper">
              Create a separate Company for a different business or team. Add more websites inside
              your existing Company.
            </p>
            <button type="submit" className="btn primary full" disabled={busy}>
              {busy ? "Creating..." : "Create Company"}
            </button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p>
          <button
            type="button"
            className="btn quiet"
            disabled={busy}
            onClick={async () => {
              try {
                await api("/api/auth/sign-out", { method: "POST", body: "{}" });
                location.assign("/login");
              } catch {
                setError("Sign out failed. Try again.");
              }
            }}
          >
            Sign out
          </button>
        </p>
      </section>
    </div>
  );
}
