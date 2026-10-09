"use client";
export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Halaman gagal dimuat</h1>
        <p className="muted">
          Periksa koneksi dan coba lagi. Jika masalah berlanjut, hubungi operator instalasi.
        </p>
        <button className="btn primary" onClick={reset}>
          Coba lagi
        </button>
      </section>
    </main>
  );
}
