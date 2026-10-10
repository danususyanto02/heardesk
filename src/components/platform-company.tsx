"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { PlatformCompany } from "@/modules/platform/domain/platform-repository";

export function PlatformCompanyEditor({ initial }: Readonly<{ initial: PlatformCompany }>) {
  const [company, setCompany] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [limits, setLimits] = useState(initial.limits);
  const [statusReason, setStatusReason] = useState("");
  const [limitReason, setLimitReason] = useState("");
  const [limitsVersion, setLimitsVersion] = useState(initial.updatedAt);
  async function save(action: "status" | "limits") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload =
        action === "status"
          ? {
              action,
              status: company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
              reason: statusReason,
              expectedUpdatedAt: company.updatedAt,
            }
          : { action, ...limits, reason: limitReason, expectedUpdatedAt: limitsVersion };
      const updated = await api<PlatformCompany>(`/api/platform/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setCompany(updated);
      if (action === "limits") {
        setLimits(updated.limits);
        setLimitsVersion(updated.updatedAt);
      }
      setNotice(action === "status" ? "Company status updated." : "Company allowances updated.");
      if (action === "status") {
        setStatusReason("");
      } else {
        setLimitReason("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Change failed. Reload and retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="platform-edit-grid">
      <section className="platform-panel platform-edit">
        <h2>Account status</h2>
        <p>
          Current status: <strong>{company.status === "ACTIVE" ? "Active" : "Suspended"}</strong>
        </p>
        {company.reason && <p className="helper">Latest reason: {company.reason}</p>}
        <p className="helper">
          Suspension pauses Company access and new widget submissions. Existing reports and files
          stay stored.
        </p>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void save("status");
          }}
        >
          <label>
            <span>Reason for status change</span>
            <textarea
              value={statusReason}
              required
              maxLength={500}
              disabled={busy}
              onChange={(event) => setStatusReason(event.target.value)}
            />
          </label>
          <button type="submit" className="btn" disabled={busy}>
            {company.status === "ACTIVE" ? "Suspend Company" : "Reactivate Company"}
          </button>
        </form>
      </section>
      <section className="platform-panel platform-edit">
        <h2>Company allowances</h2>
        <p className="helper">
          Lowering a limit does not remove data. It prevents further allocation until usage fits the
          new allowance.
        </p>
        <button
          type="button"
          className="btn quiet"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const current = await api<PlatformCompany>(`/api/platform/companies/${company.id}`);
              setCompany(current);
              setLimits(current.limits);
              setLimitsVersion(current.updatedAt);
            } catch {
              setError("Could not reload saved allowances. Retry.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Reload saved allowances
        </button>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void save("limits");
          }}
        >
          {(
            [
              ["websites", "Websites limit"],
              ["seats", "Seats limit"],
              ["monthlyReports", "Monthly reports limit"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                required
                min={0}
                max={2147483647}
                step={1}
                value={limits[key]}
                disabled={busy}
                onChange={(event) =>
                  setLimits((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
              />
            </label>
          ))}
          <label>
            <span>Storage limit (bytes)</span>
            <input
              inputMode="numeric"
              pattern="[0-9]+"
              required
              maxLength={19}
              value={limits.storageBytes}
              disabled={busy}
              onChange={(event) =>
                setLimits((current) => ({ ...current, storageBytes: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Reason for allowance change</span>
            <textarea
              required
              maxLength={500}
              value={limitReason}
              disabled={busy}
              onChange={(event) => setLimitReason(event.target.value)}
            />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Saving..." : "Save allowances"}
          </button>
        </form>
      </section>
      {error && (
        <p className="error platform-feedback" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <output className="platform-feedback" aria-live="polite">
          {notice}
        </output>
      )}
    </div>
  );
}
