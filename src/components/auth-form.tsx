"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
export function AuthForm({ setup = false, signupEnabled = false }: { setup?: boolean; signupEnabled?: boolean }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState(""), [visible, setVisible] = useState(false);
  const [created, setCreated] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (setup) {
        await api("/api/setup", { method: "POST", body: JSON.stringify(data) });
        setCreated(true);
        try {
          await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: data.email, password: data.password }) });
          router.replace("/settings?onboarding=1"); router.refresh();
        } catch {
          setError("Akun berhasil dibuat, tetapi masuk otomatis gagal. Silakan masuk dengan akun baru Anda.");
        }
      } else {
        await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: data.email, password: data.password }) });
        router.replace("/dashboard"); router.refresh();
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Permintaan gagal."); } finally { setBusy(false); }
  }
  if (created && error) return <div className="auth-page"><a className="brand" href="/">uReport</a><section className="auth-panel"><h1>Akun admin sudah dibuat</h1><p role="status">{error}</p><a className="btn primary" href="/login?setup=done">Masuk ke akun baru</a></section></div>;
  return <div className="auth-page"><a className="brand" href="/">{setup ? "uReport" : "HearDesk"}</a><section className="auth-panel"><h1>{setup ? "Buat akun pengelola" : "Sign in to HearDesk"}</h1><p className="muted">{setup ? "Buat akun, tambahkan website, lalu salin kode pemasangan." : "Open your Company's feedback inbox and website settings."}</p><form onSubmit={submit} className="form-stack">
    {setup && <div><label htmlFor="setup-token">Kode aktivasi instalasi</label><input id="setup-token" name="token" type="password" required minLength={32} autoComplete="off" aria-describedby="setup-token-help"/><p id="setup-token-help" className="helper">Hanya diperlukan sekali, saat membuat akun pertama.</p><details className="setup-help"><summary>Di mana saya menemukan kodenya?</summary><p className="helper">Minta kode kepada orang yang memasang uReport. Jika Anda memasangnya sendiri, salin nilai UREPORT_SETUP_TOKEN dari file .env di server.</p></details></div>}
    <label>{setup ? "Email admin" : "Email"}<input name="email" type="email" required maxLength={254} autoComplete="username"/></label>
    <div><label htmlFor="password">Password</label><div className="password-control"><input id="password" name="password" type={visible ? "text" : "password"} required minLength={setup ? 15 : undefined} maxLength={128} autoComplete={setup ? "new-password" : "current-password"} aria-describedby={setup ? "password-help" : undefined}/><button className="btn quiet" type="button" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Sembunyikan" : "Lihat"}</button></div>{setup && <span id="password-help" className="helper">Minimal 15 karakter. Gunakan passphrase atau password manager.</span>}</div>
    {error && <p className="error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy ? "Memproses…" : setup ? "Buat akun" : "Sign in"}</button>
  </form>{!setup && <p><a href="/forgot-password">Forgot password?</a>{signupEnabled && <> · <a href="/signup">Create account</a></>}</p>}<p className="helper">{setup ? "Anda langsung masuk setelah akun dibuat. Kode aktivasi instalasi tidak diberikan kepada pengunjung." : "Visitors do not need accounts to send feedback."}</p></section></div>;
}
