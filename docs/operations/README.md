# Operasional uReport

## Database dan migration

Runtime `DATABASE_URL` memakai akun CONNECT/USAGE dan SELECT/INSERT/UPDATE/DELETE, bukan superuser atau pemilik schema. Operator `MIGRATION_DATABASE_URL` memakai owner schema. Tables dibuat oleh migrator; default privileges runtime harus diterapkan untuk schema yang digunakan.

`npm run db:migrate` menerapkan migration artifact committed dengan `prisma migrate deploy`. Jangan menjalankan reset, `db push`, atau `migrate dev` pada database production. Jangan menggunakan database proyek lain sebagai shadow/test database.

Konfigurasi setup memakai `UREPORT_SETUP_TOKEN` (Kode aktivasi instalasi), dibuat dengan CSPRNG minimal32byte. Token tidak dipasang pada snippet atau URL. Setelah setup, route tetap tertutup meskipun token lama diketahui. Untuk konfigurasi lama, ganti nama `BOOTSTRAP_TOKEN` menjadi `UREPORT_SETUP_TOKEN` tanpa mengubah nilainya.

## Proxy dan TLS

Production harus memakai `APP_URL=https://...`. Reverse proxy mengakhiri TLS, membatasi upload request6MiB, timeout15–30detik, dan menutup akses backend langsung. Bila `TRUST_PROXY=true`, proxy harus **mengganti** `X-Forwarded-For`, bukan mempercayai input client. Backend hanya dapat dicapai proxy terpercaya.

Tanpa trusted proxy, limiter menggunakan shared client bucket dan global limit untuk mencegah spoofing IP; traffic pengunjung dapat berbagi limit. Gunakan TLS database yang memverifikasi certificate/hostname atau private tunnel, dan firewall allowlist source IP. `sslmode=disable` bukan transport terenkripsi.

Next.js CSP script memakai nonce dan frame-ancestors per widget domain. Inline style diizinkan karena layout React/widget; inline script production memerlukan nonce. App tidak mengklaim limiter melindungi terhadap volumetric DDoS.

## Backup konsisten

1. Hentikan app/writes: `docker compose stop app`. Migration service tidak perlu dijalankan.
2. Dump database menggunakan PostgreSQL client yang kompatibel: `pg_dump --format=custom --file=backups/ureport.dump "$BACKUP_DATABASE_URL"` pada shell operator; connection credential bukan history publik.
3. Salin semua file volume uploads menggunakan container/tool backup yang tepercaya. Untuk Node lokal, salin direktori `STORAGE_DIR` secara utuh.
4. Restart app setelah dump/files selesai. Jangan menghapus volumes dengan `down -v`.
5. Enkripsi database dump dan uploads jika dipindahkan keluar host; simpan kunci terpisah, akses operator terbatas. Backup tidak berada pada `public/`/Git.

Restore pada database/volume baru terlebih dahulu. Gunakan `pg_restore` ke database tujuan yang dikonfirmasi, restore uploads, periksa row Attachment dan setiap file, lalu arahkan app ke hasil restore. Uji login/detail dan endpoint screenshot; jangan mengklaim restore berhasil hanya dari exit code arsip. Retensi backup ditentukan operator berdasarkan data pribadi email/pesan/screenshot.

## Upgrade dan rollback

Backup sebelum upgrade. Hentikan writes, jalankan migration release melalui operator, lalu image baru. Jika gagal, jangan reset database. Restore backup database+files dan image kompatibel jika schema tidak backward-compatible; mengganti image saja tidak mengembalikan schema.

## Recovery admin

Jalankan lokal/server sebagai operator, sediakan `UREPORT_NEW_PASSWORD` pada environment (15–128karakter), lalu `npm run admin:reset`. Tool memakai hashing Better Auth dan menghapus sesi admin lama. Tidak membuka signup/setup kembali. Hapus environment password sesudah selesai; jangan masukkan password ke terminal output atau repository.

## Kuota dan file reconciliation

Default: quota1GiB, minimum disk free256MiB, file5MiB, decode20MP, concurrency2 per app instance. `npm run storage:reconcile` mencocokkan Attachment/files, membersihkan orphan/reservation lebih dari24jam, dan menghitung ulang quota. Jalankan dengan writes dihentikan pada maintenance window; backup terlebih dahulu. Tool tidak menghapus active attachments.

Jika screenshot hilang tetapi row masih ada, pulihkan backup; reconciliation tidak mengganti file hilang dengan placeholder palsu. Low-capacity upload menghasilkan error, kiriman teks tanpa file dapat dilanjutkan jika database/resource masih sehat.

## Patch, secrets, dan logs

Pantau advisories Next.js, Better Auth, Prisma, Sharp, Node/base image. Jalankan tests/build/npm audit dan image vulnerability scan sebelum release. Secret hanya runtime; rotasi auth secret dapat mengakhiri sesi. Bootstrap token baru tidak membuka setup yang sudah selesai. Log aplikasi menggunakan request ID/type error, tanpa isi feedback/secret; reverse proxy logs juga perlu redact URL/token dan batas retensi.

## Gap verifikasi lingkungan

Build/typecheck/browser tests dapat berjalan tanpa Docker. Host Docker, HTTPS certificate/TLS database, backup off-host encryption/restore, serta proxy firewall production membutuhkan verifikasi di deployment tujuan. Jangan menerbitkan klaim readiness yang belum diuji di host tersebut.
