# MetodeQu Backend

Native PHP modular REST backend scaffold. The existing SPA/PWA stays in src/frontend; this backend lives independently in src/backend.

Structure:

    src/backend/
    ├── public/
    │   ├── index.php
    │   └── router.php
    ├── bootstrap.php
    ├── config/
    │   ├── app.php
    │   └── database.php
    ├── routes/
    │   └── api.php
    ├── app/
    │   ├── Core/
    │   │   ├── Database.php
    │   │   ├── Request.php
    │   │   ├── Response.php
    │   │   └── Router.php
    │   └── Modules/
    │       ├── Health/
    │       └── README.md
    └── storage/
        ├── logs/
        └── cache/

Module convention:

    Progress/
    ├── ProgressController.php
    ├── ProgressService.php
    ├── ProgressRepository.php
    ├── ProgressValidator.php
    └── routes.php

Environment configuration is loaded by `App\\Core\\Env` from `src/backend/.env` before application config is evaluated. For this project, values from `.env` intentionally override environment variables inherited from the container/Kubernetes Pod. If `.env` is absent, the backend can still fall back to process environment variables. No dotenv dependency is required.

Local run:

    cd src/backend
    APP_ENV=development APP_DEBUG=true php -S 127.0.0.1:8080 public/router.php

Health endpoint:

    GET http://127.0.0.1:8080/api/health

Database migrations live in `src/backend/database/migrations` and are applied by the root tool:

    php tools/migrate.php --status
    php tools/migrate.php --dry-run
    php tools/migrate.php

The migration runner loads `src/backend/.env`, verifies checksums for already-applied migrations, uses a MySQL advisory lock, and records successful migrations in `schema_migrations`.

Implementation order: Auth + user identity first, then Pondok membership/authorization, then Progress sync. For offline-first PWA sync, IndexedDB remains the client queue while PHP/MySQL becomes the server source of truth.

Do not trust context, pondok_id, musyrif type, or role values from the browser without server-side authorization checks.


Registration endpoint:

    POST /api/auth/register

Personal registration creates `users` and `auth_credentials`. Pondok registration additionally creates `pondoks` and an active `pondok_memberships` row with role `admin`, all in one transaction. Passwords are stored only through PHP `password_hash()`.


Registration DB smoke test (creates rows only inside an outer transaction and always rolls them back):

    php tools/test-register.php

SMTP mail is configured from `src/backend/.env`. Gmail SMTP uses STARTTLS on port 587. Credentials and app passwords must never be committed.

Safe SMTP authentication check (does not send an email):

    php tools/test-mail.php

## Daftar publik ustadz dan donasi

`GET /api/public/ustadz` tidak memerlukan autentikasi. Respons hanya berisi nama ustadz, tipe platform/pondok, jumlah santri aktif, total penilaian setoran, penilaian mutqin sejak tercatat, dan total nominal donasi terverifikasi untuk bulan kalender berjalan (Asia/Jakarta).

Jalankan migrasi `20261028_019_donation_transfers` sebelum mengaktifkan API tersebut. Kolom `donation_transfers.status='verified'` hanya boleh diset setelah transfer diverifikasi oleh petugas berwenang. Wajib isi `verified_by` dan `verified_at`. Tabel ini belum menyediakan UI pencatatan atau verifikasi, sehingga nominal saat belum ada catatan akan tampil Rp0. Ini berarti belum ada donasi *yang tercatat dan terverifikasi* di Mutqeen, bukan bukti belum ada transfer melalui rekening ustadz.

## Rekening dan aktivitas publik ustadz

Halaman /#donasi menampilkan tombol **Donate** (nomor rekening) dan **Aktivitas** (foto dan agregat progres halaqah). API detail GET /api/public/ustadz/detail?id=PROFILE_ID dan GET /api/public/ustadz/photo?id=PHOTO_ID tidak mengungkap data per santri.

Jalankan seluruh migrasi hingga 20261028_020_ustadz_donation_profile, termasuk 019. Pemilik akun ustadz mengelola rekening, izin publikasi, dan foto di bagian **Informasi untuk Donatur** pada dashboard ustadz.

- GET /api/ustadz/donation-profile dan POST /api/ustadz/donation-profile/bank membutuhkan Bearer token akun ustadz aktif.
- Upload foto menggunakan POST /api/ustadz/donation-profile/photo dengan multipart photo, halaqah_id wajib, consent=yes. Keterangan otomatis "Aktivitas Halaqah" bila kosong. Foto langsung diambil melalui kamera pada Detail Halaqah; tidak ada pemilih file. Penghapusan lewat POST /api/ustadz/donation-profile/photo/delete dengan JSON id.
- Upload membutuhkan ekstensi PHP GD dan izin tulis pada src/backend/storage/ustadz-activities. Direktori ada di repository tetapi hak tulis tetap harus diberikan kepada user proses PHP/FrankenPHP di server; folder ini harus persisten dan masuk backup. PHP harus mengizinkan upload sampai 2 MB. Jika server mengembalikan HTTP 503, periksa pesan spesifik (izin folder, migrasi, GD, atau kapasitas disk). Kesalahan tak terduga dicatat di PHP error log dengan kode error acak.
- Foto diubah menjadi JPEG dengan panjang sisi maksimum 1400 piksel untuk membuang metadata asli. Ustadz wajib memastikan izin publikasi foto, terutama jika ada santri. Rekening dan foto tidak dibuat dengan data contoh.
- Rekening terlihat hanya saat is_public aktif. Foto yang telah dihapus tidak boleh lagi tersedia melalui API.
- Progres per halaqah mencakup santri aktif, aktivitas bulan berjalan, total penilaian setoran, mutqin, dan rata-rata progres harian terakhir yang tercatat. Bila belum ada data, persentase ditandai belum tersedia.

Urutan deployment: backup database, jalankan migrasi, pastikan ekstensi GD dan direktori penyimpanan, deploy frontend/backend terbaru, lalu uji login ustadz, simpan rekening, unggah dan hapus foto, serta buka kedua popup pada domain publik.

## Daftar santri yang wajib login

Tombol **Santri aktif** mengarahkan ke login bila belum memiliki token. Login email/OTP riil
mengembalikan pengguna ke `/#donasi-santri?ustadz=PROFILE_ID&halaqah=HALAQAH_ID`.

Endpoint `GET /api/ustadz/santri?ustadz_id=PROFILE_ID&halaqah_id=HALAQAH_ID`
memerlukan Bearer token yang diverifikasi server melalui `SessionService::userFromToken`.
Tanpa token / sesi kedaluwarsa mendapat HTTP 401 dan tidak menerima data pribadi.
Endpoint publik anonim lama dihapus.

Hasil berisi nama asli santri aktif dan catatan progres harian terakhir
(`completion_percent`, minggu, hari, updated_at). Tidak mengirim ID, email,
nomor HP, `fields` atau `checks`. Progres kosong berupa null, bukan 0%.
Persentase adalah kelengkapan isian harian, bukan total hafalan.
Akun apa pun yang login riil saat ini boleh melihatnya; belum ada role donatur tersendiri.
Tidak ada migrasi database.

## Akun Donatur dan akses progres santri

Registrasi dengan `POST /api/auth/register` dan `mode=donatur` membuat role
`member` ditambah `donatur`, lalu mengikuti proses verifikasi email/WhatsApp
yang sudah berlaku. Akun yang sudah login bisa menambahkan role Donatur melalui
`POST /api/donatur/activate` dengan Bearer token; operasi bersifat idempoten dan
tidak menghapus role lain. `GET /api/ustadz/santri` memerlukan sesi valid
**dan** role Donatur aktif; mengembalikan 401 untuk sesi tidak valid atau 403
untuk akun yang bukan Donatur. Tidak ada migrasi karena `user_roles.role`
menggunakan VARCHAR(50). Pembukaan akses Donatur tidak memverifikasi pembayaran
donasi, karena proses verifikasi transfer terpisah dari pengelolaan role.
