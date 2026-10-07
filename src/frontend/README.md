# MetodeQu Frontend Prototype

Frontend prototype untuk demo MetodeQu.

## Stack

- HTML
- CSS
- JavaScript ES Modules
- Dummy data
- localStorage untuk state demo
- PWA manifest + service worker

## Menjalankan

Dari root repository:

```bash
python3 -m http.server 8080 --directory src/frontend
```

Buka `http://localhost:8080`.

## Demo

Prototype menyediakan tiga persona:

- Member
- Musyrif
- Admin Pondok

Gunakan tombol `Demo: member` di sidebar untuk berpindah persona.

Member dapat berpindah context:

- Personal
- Pondok Al-Furqan

## PWA

PWA menggunakan:

- `manifest.webmanifest`
- `service-worker.js`
- offline app shell cache
- install prompt ketika browser mendukung

Service worker membutuhkan HTTPS pada production atau localhost saat development.

## Catatan

Ini adalah prototype frontend dengan dummy data. Auth, database, OTP, WhatsApp, setoran, dan review belum terhubung backend nyata.
