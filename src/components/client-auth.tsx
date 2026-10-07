"use client";
import { useState } from "react";
import { api } from "@/lib/api";

type Mode = "signup" | "forgot" | "reset" | "verify";
export function ClientAuth({ mode, token, verified = false, verificationError }: { mode: Mode; token?: string; verified?: boolean; verificationError?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState(false);
  const title = mode === "verify" ? verified ? "Email verified" : "Check your email" : mode === "signup" ? "Create your HearDesk account" : mode === "forgot" ? "Reset your password" : "Set a new password";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "signup") {
        await api("/api/auth/sign-up/email", { method: "POST", body: JSON.stringify({ name: values.name, email: values.email, password: values.password, callbackURL: location.origin + "/verify-email?verified=1" }) });
        location.assign("/verify-email?email=" + encodeURIComponent(String(values.email)));
      } else if (mode === "forgot") {
        await api("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email: values.email, redirectTo: location.origin + "/reset-password" }) }); setDone(true);
      } else if (mode === "reset") {
        await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword: values.password }) }); setDone(true);
      } else {
        await api("/api/auth/send-verification-email", { method: "POST", body: JSON.stringify({ email: values.email, callbackURL: location.origin + "/verify-email?verified=1" }) }); setDone(true);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><a className="brand" href="/">HearDesk</a><section className="auth-panel"><h1>{title}</h1>
    {verificationError && <p className="error" role="alert">{verificationError}</p>}
    <p className="muted">{mode === "signup" ? "Create an account, then connect your Company's websites." : mode === "verify" ? verified ? "Your email address is verified. Sign in to create or open your Company." : "Open the verification link to finish creating your account. During local development, email is captured in the private local inbox." : "Use your account email to recover access to HearDesk."}</p>
    {done ? <p role="status">{mode === "reset" ? "Your password has been changed." : mode === "forgot" ? "If an account exists, a reset link has been sent." : "If verification is needed, a new link has been sent."}</p> : verified ? null : <form onSubmit={submit} className="form-stack">
      {mode === "signup" && <label>Your name<input name="name" required maxLength={120} autoComplete="name"/></label>}
      {mode !== "reset" && <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email"/></label>}
      {(mode === "signup" || mode === "reset") && <div><label htmlFor="client-password">{mode === "reset" ? "New password" : "Password"}</label><input id="client-password" name="password" type="password" required minLength={15} maxLength={128} autoComplete="new-password" aria-describedby="client-password-help"/><span id="client-password-help" className="helper">Use at least 15 characters.</span></div>}
      {mode === "reset" && !token && <p className="error" role="alert">Reset link is missing or invalid. Request a new link.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary full" disabled={busy || (mode === "reset" && !token)}>{busy ? "Processing..." : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Reset password" : "Resend verification link"}</button>
    </form>}
    <p><a href="/login">Sign in</a>{mode === "reset" && <> · <a href="/forgot-password">Request a new reset link</a></>}</p>
  </section></div>;
}
