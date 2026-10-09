import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Halaman tidak ditemukan</h1>
        <p className="muted">
          Alamat tidak tersedia atau widget belum dikonfigurasi untuk domain ini.
        </p>
        <Link className="btn" href="/">
          Ke uReport
        </Link>
      </section>
    </main>
  );
}
