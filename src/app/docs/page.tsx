import Link from "next/link";

export default function Documentation() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link className="brand" href="/">
          HearDesk
        </Link>
        <Link className="btn" href="/login">
          Masuk ke dashboard
        </Link>
      </header>
      <main className="public-docs">
        <Link className="back-link" href="/">
          Kembali ke halaman utama
        </Link>
        <h1>Integrasikan widget HearDesk ke website Anda</h1>
        <p className="muted">
          Pengunjung mengirim feedback tanpa akun. Tim meninjau laporan dan mengirim balasan publik
          melalui inbox HearDesk.
        </p>
        <section>
          <h2>Tambahkan website</h2>
          <p>
            Masuk ke dashboard, pilih Company yang sesuai, lalu buka menu Website. Tambahkan alamat
            website tempat widget akan dipasang. Origin harus sesuai dengan website yang dikunjungi,
            termasuk protokol dan port.
          </p>
          <p>
            <code>https://example.com</code> dan <code>https://www.example.com</code> adalah origin
            berbeda. Daftarkan alamat yang benar untuk masing-masing website.
          </p>
        </section>
        <section>
          <h2>Salin kode pemasangan</h2>
          <p>
            Pilih website yang sudah ditambahkan lalu salin kode pemasangan. Kode tersebut sudah
            berisi alamat HearDesk dan kode website Anda.
          </p>
          <pre>
            <code>
              {
                '<script src="https://ALAMAT_HEARDESK/widget.js" data-site="KODE_WEBSITE" defer></script>'
              }
            </code>
          </pre>
          <p className="helper">
            Contoh di atas memakai placeholder. Gunakan kode lengkap yang disalin dari dashboard.
          </p>
        </section>
        <section>
          <h2>Tempel ke website</h2>
          <p>
            Tempel kode sebelum penutup <code>&lt;/body&gt;</code> pada layout utama website. Pada
            CMS, gunakan area custom code atau footer scripts. Pasang script satu kali per halaman.
          </p>
          <p>
            Website HTTPS memerlukan alamat HearDesk HTTPS. Jika website menggunakan Content
            Security Policy, izinkan origin HearDesk pada <code>script-src</code> dan{" "}
            <code>frame-src</code>. Pertahankan aturan CSP lain yang diperlukan website Anda.
          </p>
        </section>
        <section>
          <h2>Uji widget dan pelacakan</h2>
          <p>
            Buka website terdaftar, klik tombol feedback, lalu kirim laporan percobaan. Email dan
            screenshot opsional; pengunjung tidak perlu login.
          </p>
          <p>
            Setelah laporan diterima, pengunjung mendapat kode dan link pelacakan. Simpan keduanya
            untuk melihat status dan balasan publik tim. Kode tersebut membuka akses ke laporan,
            jadi jangan dibagikan ke orang lain.
          </p>
          <p>
            Buka inbox HearDesk untuk menemukan laporan, mengubah status, atau mengirim balasan
            untuk pelapor. Catatan internal hanya terlihat oleh tim.
          </p>
          <Link className="text-link" href="/track">
            Buka halaman pelacakan feedback
          </Link>
        </section>
        <section>
          <h2>Jika widget tidak muncul</h2>
          <ul>
            <li>Periksa script terpasang satu kali dan kode website sesuai dengan dashboard.</li>
            <li>
              Pastikan origin website terdaftar cocok, termasuk HTTP/HTTPS, subdomain, dan port.
            </li>
            <li>Periksa console browser untuk pemblokiran CSP, mixed content, atau ekstensi.</li>
            <li>Pastikan Company aktif dan alamat HearDesk dapat diakses pengunjung.</li>
          </ul>
          <p>
            Untuk mengubah posisi dan label tombol, buka pengaturan website. Jika kode pemasangan
            diperbarui, ganti snippet lama di website. Laporan yang sudah diterima tetap tersimpan.
          </p>
        </section>
        <section>
          <h2>Demo dan laporan nyata</h2>
          <p>
            Demo widget di halaman depan hanya berjalan di browser dan tidak menyimpan isian. Untuk
            menerima laporan dan mendapatkan kode pelacakan nyata, gunakan widget pada website
            terdaftar.
          </p>
        </section>
      </main>
    </div>
  );
}
