"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { PlatformUser } from "@/modules/platform/domain/platform-repository";
export function PlatformUserEditor({
  initial,
}: Readonly<{
  initial: PlatformUser & { accountStatus: string };
}>) {
  const [user, setUser] = useState(initial);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function change(action: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/platform/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason }),
      });
      setUser(await api(`/api/platform/users/${user.id}`));
      setReason("");
      setNotice(action === "REVOKE_SESSIONS" ? "All sessions revoked." : "Account status updated.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="platform-panel platform-edit">
      <h2>Account operations</h2>
      <p>
        Status: <strong>{user.accountStatus}</strong>
      </p>
      <p className="helper">
        Suspension blocks this account across all Companies and revokes sessions. It does not delete
        Company memberships.
      </p>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void change(user.accountStatus === "ACTIVE" ? "SUSPEND" : "REACTIVATE");
        }}
      >
        <label>
          <span>Reason for account action</span>
          <textarea
            required
            maxLength={500}
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="key-actions">
          {user.platformRole !== "PLATFORM_OWNER" && (
            <button type="submit" className="btn" disabled={busy}>
              {user.accountStatus === "ACTIVE" ? "Suspend account" : "Reactivate account"}
            </button>
          )}
          <button
            className="btn"
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => change("REVOKE_SESSIONS")}
          >
            Revoke sessions
          </button>
        </div>
        {user.platformRole === "PLATFORM_OWNER" && (
          <p className="helper">Platform Owner accounts are protected from suspension.</p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <output aria-live="polite">{notice}</output>}
      </form>
    </section>
  );
}
