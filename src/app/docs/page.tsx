import Link from "next/link";

export default function Documentation() {
  return <div className="landing">
    <header className="landing-header"><Link className="brand" href="/">uReport</Link><Link className="btn" href="/login">Masuk admin</Link></header>
    <main className="public-docs">
      <Link className="back-link" href="/">Kembali ke halaman utama</Link>
      <h1>Pasang uReport di server Anda</h1>
      <p className="muted">Panduan ringkas untuk operator instalasi. Detail deployment dan recovery tersedia dalam README paket aplikasi.</p>
      <section>
        <h2>Siapkan aplikasi</h2>
        <p>Gunakan Node.js 24 dan PostgreSQL. Isi konfigurasi runtime pada <code>.env</code> serta akun migrasi terpisah pada <code>.env.migration</code>. Buat auth secret dan <code>UREPORT_SETUP_TOKEN</code> acak.</p>
        <pre><code>{"npm ci\nnpm run db:migrate\nnpm run build\nnpm start"}</code></pre>
        <p>Gunakan HTTPS dan TLS database terverifikasi atau tunnel privat untuk deployment production.</p>
      </section>
      <section>
        <h2>Buat akun admin pertama</h2>
        <p>Buka halaman setup, masukkan Kode aktivasi instalasi dari <code>UREPORT_SETUP_TOKEN</code>, lalu email dan password admin. Anda langsung masuk untuk menghubungkan website di dashboard. Jika login otomatis gagal, masuk melalui halaman login biasa. Setup ditutup setelah akun dibuat.</p>
        <Link className="text-link" href="/setup">Buka setup instalasi</Link>
      </section>
      <section>
        <h2>Pasang widget</h2>
        <p>Buka menu Website, tambahkan alamat website, lalu salin kode pemasangan. Tempel seluruh kode sebelum penutup <code>&lt;/body&gt;</code> website tersebut. Tidak perlu membuat atau mengisi kode penghubung secara terpisah.</p>
        <p>Jika perlu mengganti kode, buka Pengaturan lanjutan lalu pilih Perbarui kode pemasangan. Kode lama tidak berlaku setelah konfirmasi; pasang kode baru. Laporan lama tetap tersimpan.</p>
        <p>Pengunjung tidak perlu login. Situs pemasang harus mengizinkan script dan iframe dari origin uReport jika memakai CSP. Domain HTTPS memerlukan widget HTTPS.</p>
      </section>
      <section>
        <h2>Rawat data dan akses</h2>
        <p>Backup database dan file screenshot bersama. Gunakan persistent storage, akses database terbatas, dan pembaruan dependency. Akun runtime bukan superuser. Jangan mengirim auth secret atau kode aktivasi instalasi ke pengunjung.</p>
        <p>Untuk feedback publik, gunakan widget pada website terdaftar. Tombol Coba widget di landing adalah demo lokal dan tidak menyimpan isian.</p>
      </section>
    </main>
  </div>;
}
