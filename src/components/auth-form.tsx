"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PublicDemoAccess } from "@/modules/identity/domain/demo-accounts";
export function AuthForm({
  setup = false,
  signupEnabled = false,
  demoAccess = null,
}: Readonly<{
  setup?: boolean;
  signupEnabled?: boolean;
  demoAccess?: PublicDemoAccess | null;
}>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [created, setCreated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoSelection, setDemoSelection] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);
  const submitLabel = setup ? "Buat akun" : "Sign in";
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (setup) {
        await api("/api/setup", { method: "POST", body: JSON.stringify(data) });
        setCreated(true);
        try {
          await api("/api/auth/sign-in/email", {
            method: "POST",
            body: JSON.stringify({ email: data.email, password: data.password }),
          });
          router.replace("/settings?onboarding=1");
          router.refresh();
        } catch {
          setError(
            "Akun berhasil dibuat, tetapi masuk otomatis gagal. Silakan masuk dengan akun baru Anda.",
          );
        }
      } else {
        await api("/api/auth/sign-in/email", {
          method: "POST",
          body: JSON.stringify({ email: data.email, password: data.password }),
        });
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Permintaan gagal.");
    } finally {
      setBusy(false);
    }
  }
  if (created && error) {
    return (
      <div className="auth-page">
        <a className="brand" href="/">
          uReport
        </a>
        <section className="auth-panel">
          <h1>Akun admin sudah dibuat</h1>
          <output aria-live="polite">{error}</output>
          <a className="btn primary" href="/login?setup=done">
            Masuk ke akun baru
          </a>
        </section>
      </div>
    );
  }
  return (
    <div className="auth-page">
      <a className="brand" href="/">
        {setup ? "uReport" : "HearDesk"}
      </a>
      <section className="auth-panel">
        <h1>{setup ? "Buat akun pengelola" : "Sign in to HearDesk"}</h1>
        <p className="muted">
          {setup
            ? "Buat akun, tambahkan website, lalu salin kode pemasangan."
            : "Open your Company's feedback inbox and website settings."}
        </p>
        <form onSubmit={submit} className="form-stack">
          {setup && (
            <div>
              <label htmlFor="setup-token">Kode aktivasi instalasi</label>
              <input
                id="setup-token"
                name="token"
                type="password"
                required
                minLength={32}
                autoComplete="off"
                aria-describedby="setup-token-help"
              />
              <p id="setup-token-help" className="helper">
                Hanya diperlukan sekali, saat membuat akun pertama.
              </p>
              <details className="setup-help">
                <summary>Di mana saya menemukan kodenya?</summary>
                <p className="helper">
                  Minta kode kepada orang yang memasang uReport. Jika Anda memasangnya sendiri,
                  salin nilai UREPORT_SETUP_TOKEN dari file .env di server.
                </p>
              </details>
            </div>
          )}
          <label>
            {setup ? "Email admin" : "Email"}
            <input
              ref={emailInput}
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <div>
            <label htmlFor="password">Password</label>
            <div className="password-control">
              <input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                required
                minLength={setup ? 15 : undefined}
                maxLength={128}
                autoComplete={setup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={setup ? "password-help" : undefined}
              />
              <button
                className="btn quiet"
                type="button"
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
              >
                {visible ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
            {setup && (
              <span id="password-help" className="helper">
                Minimal 15 karakter. Gunakan passphrase atau password manager.
              </span>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary full" disabled={busy}>
            {busy ? "Memproses…" : submitLabel}
          </button>
        </form>
        {!setup && (
          <p>
            <a href="/forgot-password">Forgot password?</a>
            {signupEnabled && (
              <>
                {" "}
                · <a href="/signup">Create account</a>
              </>
            )}
          </p>
        )}
        <p className="helper">
          {setup
            ? "Anda langsung masuk setelah akun dibuat. Kode aktivasi instalasi tidak diberikan kepada pengunjung."
            : "Visitors do not need accounts to send feedback."}
        </p>
        {!setup && demoAccess && (
          <section className="auth-demo" aria-labelledby="demo-accounts-title">
            <header>
              <h2 id="demo-accounts-title">Demo accounts</h2>
              <p className="helper">Choose a role to fill the form, then select Sign in.</p>
            </header>
            <p className="auth-demo-notice">
              These accounts are shared with other visitors. Changes are visible to everyone using
              the demo. Do not enter personal or confidential information.
            </p>
            <p className="auth-demo-password">
              <span>Password for all demo accounts</span>
              <code>{demoAccess.password}</code>
            </p>
            <ul className="auth-demo-list">
              {demoAccess.accounts.map((account) => (
                <li key={account.id}>
                  <div>
                    <h3 id={account.id + "-label"}>{account.label}</h3>
                    <p className="helper">{account.description}</p>
                    <p className="auth-demo-email">
                      <span className="sr-only">Email: </span>
                      {account.email}
                    </p>
                  </div>
                  <button
                    className="btn"
                    type="button"
                    disabled={busy}
                    aria-labelledby={account.id + "-use " + account.id + "-label"}
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(demoAccess.password);
                      setVisible(false);
                      setError("");
                      setDemoSelection(account.label + " credentials filled. Select Sign in.");
                      emailInput.current?.focus();
                    }}
                  >
                    <span id={account.id + "-use"}>Use account</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="helper" role="status">
              {demoSelection}
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
