# uReport

Feedback privat yang di-host sendiri: pengunjung mengirim masalah, saran, atau pujian melalui widget; admin membaca dan menindaklanjutinya melalui inbox.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma 7, Better Auth, Zod, dan Sharp. Screenshot disimpan pada filesystem privat. Tidak ada login pengunjung, SaaS auth, atau layanan cloud storage wajib.

## Menjalankan lokal

Persyaratan: Node.js 24 LTS dan PostgreSQL. Windows PowerShell yang memblokir `npm.ps1` dapat menggunakan `npm.cmd`.

1. `npm ci`
2. Salin `.env.example` ke `.env` dan `.env.migration.example` ke `.env.migration`. Isi connection string runtime/migrasi terpisah; jangan memakai akun PostgreSQL superuser untuk aplikasi.
3. Buat `BETTER_AUTH_SECRET` dan `UREPORT_SETUP_TOKEN` acak, misalnya dengan `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Gunakan nilai berbeda.
4. `npm run db:migrate`
5. `npm run dev`
6. Buka `http://localhost:3000/setup`, masukkan **Kode aktivasi instalasi** (nilai `UREPORT_SETUP_TOKEN` dari environment), lalu isi email/password admin. Nama admin memakai default Admin.
7. Setelah akun dibuat, aplikasi mencoba login otomatis dan membuka menu **Website**. Jika login otomatis gagal, akun tetap tersimpan dan tersedia tautan login biasa.
8. Masukkan alamat website di dashboard; URL halaman lengkap boleh ditempel. Server mengambil origin sebagai whitelist, menurunkan nama website dari domain, dan membuat key widget secara otomatis. Salin snippet yang dihasilkan.

Database uReport yang disediakan dalam workspace sudah memiliki migration awal. Akun admin belum dibuat otomatis: pilih kredensial sendiri lewat setup. Jangan gunakan kredensial demo HTML.

`APP_URL` harus sama dengan origin browser, termasuk port. Domain website menggunakan exact origin (misalnya `https://website.example`), tanpa path/query/fragment/wildcard. Setup selesai menutup pembuatan akun publik.

Kode aktivasi instalasi melindungi pembuatan admin pertama dan tidak ditampilkan di dashboard. **Key widget** adalah identifier publik yang terlihat pada snippet, bukan API key rahasia atau password. Keduanya berbeda. Konfigurasi instalasi lama perlu mengganti nama variabel `BOOTSTRAP_TOKEN` menjadi `UREPORT_SETUP_TOKEN`; nilainya tetap sama.

Alur utama: **Buat akun → Tambahkan website → Salin kode**. Menu dashboard hanya **Laporan / Website**. Key otomatis disertakan pada kode pemasangan dan tidak ditampilkan sebagai field atau langkah terpisah. Untuk mengganti key, buka **Pengaturan lanjutan → Perbarui kode pemasangan**. Konfirmasi menjelaskan kode lama tidak lagi dapat mengirim laporan; ganti kode di website sesudahnya. Laporan/catatan yang tersimpan tetap ada. Pembatasan domain tetap bekerja di server/browser, bukan pengganti rate limit API.

## Fitur

- Landing publik pada `/` dengan screenshot aplikasi, alur penggunaan, dokumentasi ringkas `/docs`, dan demo widget yang tidak memanggil API feedback atau menyimpan isian.
- CTA publik menampilkan Siapkan instalasi sebelum bootstrap selesai, lalu Masuk admin. `/inbox` dan `/settings` tetap membutuhkan session admin.
- Login/logout admin dengan database sessions dan signup publik dinonaktifkan.
- Setup satu admin/website yang atomik.
- Widget publik tanpa cookie admin atau login pengunjung.
- Search, filter jenis/status, pagination, detail, autosave status, dan catatan internal.
- Screenshot PNG/JPEG/WebP maksimal 5 MiB dan 20 MP, dinormalisasi WebP tanpa metadata.
- Screenshot diakses lewat endpoint admin, bukan direktori public.
- Rate limit PostgreSQL, batas request aktual, kuota storage dan admission upload.
- Website: alamat/nama, teks/posisi tombol, preview, dan satu kode pemasangan siap salin.
- UI mobile single-column dan detail page, labels/focus-visible, error/loading/empty/success.

Di menu Website, salin kode pemasangan aktual dan tempel sebelum `</body>` website yang diizinkan. Widget menggunakan iframe dari origin instalasi dan membuang query/fragment URL halaman. Situs pemasang perlu mengizinkan script dan frame origin uReport melalui CSP-nya sendiri. Website HTTPS memerlukan URL widget HTTPS.

Demo pada landing memakai `DemoForm` terpisah dari form widget production. Upload preview demo adalah object URL lokal yang dilepas saat dialog ditutup; submit hanya menampilkan hasil simulasi, tanpa menyimpan pesan/email/file ke server. Screenshot landing berasal dari aplikasi pada database test dan diberi label data pengujian, bukan laporan pengunjung nyata.

## Production

### Menguji integration-test.html lokal

File widget harus dibuka dari website HTTP/HTTPS, bukan `file:///`, karena file lokal memiliki origin `null` yang tidak diizinkan untuk embedding. Jalankan `npm run integration:preview`, atur Alamat website pada dashboard menjadi `http://localhost:8080` dan simpan, lalu buka `http://localhost:8080/integration-test.html`. Gunakan snippet aktif dari dashboard. `localhost` dan `127.0.0.1`, serta port yang berbeda, dihitung sebagai alamat berbeda.

Preview hanya menyajikan `integration-test.html`, bukan seluruh folder proyek atau `.env`. Konfigurasi domain berubah untuk tes lokal; kembalikan ke domain website sebenarnya setelah selesai.

```sh
npm run build
npm start
```

Atau Docker, dengan PostgreSQL eksternal yang sudah tersedia:

```sh
docker compose --env-file .env --env-file .env.migration up --build -d
```

`compose.yaml` memasukkan migration credential hanya ke service operator, bukan aplikasi. App bind ke loopback3000; pasang reverse proxy HTTPS di depan. Volume uploads/cache persisten, runtime non-root, read-only root filesystem dan resource limits. Docker image build tidak membawa `.env`/catatan AI.

Docker engine perlu aktif. Paket Docker disediakan, tetapi build/start container tetap harus diverifikasi pada host Docker production. Jangan menganggap build Next.js sama dengan pengujian container.

## Pemeriksaan

```sh
npm test
npm run typecheck
npm run build
npm audit
```

Browser E2E memakai database khusus `ureport_test`, bukan database aplikasi. Sediakan `.env.test` dengan runtime/migration URL terpisah dan APP_URL `http://localhost:3100`; bootstrap token test harus cocok fixture `tests/e2e/application.spec.ts`. Test runner menghapus data **hanya** jika URL database tepat `/ureport_test`. Run `npm run test:e2e`. Chromium dapat dipasang dengan `npx playwright install chromium`; pada Windows konfigurasi memakai Chrome lokal jika path tersedia.

## Operasional dan security

Lihat [panduan operasional](docs/operations/README.md) dan [SECURITY.md](SECURITY.md). Connection TLS diverifikasi atau tunnel privat diperlukan untuk database remote production. Workspace saat ini menggunakan koneksi remote tanpa TLS sesuai server yang diberikan; ganti konfigurasi transport sebelum exposure production.

Data `.env`, uploads, backups, build/test artifacts, prototype, dan catatan AI di-ignore. `.env.example`, source, migrations, serta dokumentasi operasional umum dapat masuk repository. Tidak ada commit/push otomatis.

Scope: satu instance aplikasi, satu admin, satu website. Belum ada AI summaries, multi-team, public board/voting, visitor reply, automated screenshot, atau 2FA. Lisensi distribusi open-source perlu dipilih pemilik sebelum publikasi.
