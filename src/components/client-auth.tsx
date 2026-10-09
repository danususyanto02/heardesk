"use client";
import { useState } from "react";
import { api } from "@/lib/api";

type Mode = "signup" | "forgot" | "reset" | "verify";

const MODE_CONFIG: Record<
  Mode,
  {
    title: string;
    description: string;
    submitLabel: string;
    doneMessage: string;
  }
> = {
  signup: {
    title: "Create your HearDesk account",
    description: "Create an account, then connect your Company's websites.",
    submitLabel: "Create account",
    doneMessage: "",
  },
  forgot: {
    title: "Reset your password",
    description: "Use your account email to recover access to HearDesk.",
    submitLabel: "Send reset link",
    doneMessage: "If an account exists, a reset link has been sent.",
  },
  reset: {
    title: "Set a new password",
    description: "Use your account email to recover access to HearDesk.",
    submitLabel: "Reset password",
    doneMessage: "Your password has been changed.",
  },
  verify: {
    title: "Check your email",
    description:
      "Open the verification link to finish creating your account. During local development, email is captured in the private local inbox.",
    submitLabel: "Resend verification link",
    doneMessage: "If verification is needed, a new link has been sent.",
  },
};

const VERIFIED_OVERRIDES = {
  title: "Email verified",
  description: "Your email address is verified. Sign in to create or open your Company.",
} as const;

export function ClientAuth({
  mode,
  token,
  verified = false,
  verificationError,
}: Readonly<{
  mode: Mode;
  token?: string;
  verified?: boolean;
  verificationError?: string;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const base = MODE_CONFIG[mode];
  const modeTitle = mode === "verify" && verified ? VERIFIED_OVERRIDES.title : base.title;
  const modeDescription =
    mode === "verify" && verified ? VERIFIED_OVERRIDES.description : base.description;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const email = values.email;
      if (mode !== "reset" && typeof email !== "string") {
        throw new Error("Enter your account email.");
      }
      if (mode === "signup") {
        await api("/api/auth/sign-up/email", {
          method: "POST",
          body: JSON.stringify({
            name: values.name,
            email,
            password: values.password,
            callbackURL: location.origin + "/verify-email?verified=1",
          }),
        });
        location.assign("/verify-email?email=" + encodeURIComponent(email as string));
        return;
      }
      if (mode === "forgot") {
        await api("/api/auth/request-password-reset", {
          method: "POST",
          body: JSON.stringify({
            email,
            redirectTo: location.origin + "/reset-password",
          }),
        });
        setDone(true);
        return;
      }
      if (mode === "reset") {
        await api("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token, newPassword: values.password }),
        });
        setDone(true);
        return;
      }
      await api("/api/auth/send-verification-email", {
        method: "POST",
        body: JSON.stringify({
          email,
          callbackURL: location.origin + "/verify-email?verified=1",
        }),
      });
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <a className="brand" href="/">
        HearDesk
      </a>
      <section className="auth-panel">
        <h1>{modeTitle}</h1>
        {verificationError && (
          <p className="error" role="alert">
            {verificationError}
          </p>
        )}
        <p className="muted">{modeDescription}</p>
        {done && <p role="status">{base.doneMessage}</p>}
        {!done && !verified && (
          <form onSubmit={submit} className="form-stack">
            {mode === "signup" && (
              <label>
                Your name
                <input name="name" required maxLength={120} autoComplete="name" />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Email
                <input name="email" type="email" required maxLength={254} autoComplete="email" />
              </label>
            )}
            {(mode === "signup" || mode === "reset") && (
              <div>
                <label htmlFor="client-password">
                  {mode === "reset" ? "New password" : "Password"}
                </label>
                <input
                  id="client-password"
                  name="password"
                  type="password"
                  required
                  minLength={15}
                  maxLength={128}
                  autoComplete="new-password"
                  aria-describedby="client-password-help"
                />
                <span id="client-password-help" className="helper">
                  Use at least 15 characters.
                </span>
              </div>
            )}
            {mode === "reset" && !token && (
              <p className="error" role="alert">
                Reset link is missing or invalid. Request a new link.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn primary full"
              disabled={busy || (mode === "reset" && !token)}
            >
              {busy ? "Processing..." : base.submitLabel}
            </button>
          </form>
        )}
        <p>
          <a href="/login">Sign in</a>
          {mode === "reset" && (
            <>
              {" "}
              · <a href="/forgot-password">Request a new reset link</a>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
