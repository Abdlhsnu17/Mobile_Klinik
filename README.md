# Deskripsi dan Struktur Aplikasi SIMKLAB

SIMKLAB (Sistem Informasi Manajemen Klinik Abdi) merupakan aplikasi mobile (Flutter) dengan backend REST API yang dikembangkan untuk mendukung pengelolaan layanan klinik secara terintegrasi, terstruktur, dan terdokumentasi. Sistem ini dirancang sebagai solusi atas kebutuhan digitalisasi proses administrasi klinik, mulai dari pengelolaan data pasien, dokter, layanan, antrian, rekam medis, laboratorium, farmasi, rawat inap, pembayaran, hingga dokumen pendukung.

Pengembangan SIMKLAB menggunakan pendekatan pengembangan perangkat lunak terstruktur, dengan pemisahan tanggung jawab antara aplikasi mobile (Flutter), backend (Node.js/Express), dan database dalam satu repositori. Dengan pendekatan ini, sistem lebih mudah dikembangkan, diuji, dan dipelihara secara bertahap sesuai kebutuhan operasional klinik.

## Tujuan Pengembangan Sistem

Tujuan dari pengembangan sistem SIMKLAB adalah sebagai berikut:

- Menyediakan sistem informasi klinik yang terpusat dan mudah dikelola.
- Mendukung proses pelayanan pasien dari pendaftaran hingga pembayaran secara digital.
- Memudahkan pencatatan hasil pemeriksaan (rekam medis), hasil laboratorium, serta permintaan farmasi.
- Mendukung pengelolaan data dokter, layanan, alat medis, dan obat secara terstruktur.
- Meningkatkan akurasi data, efisiensi kerja, dan keterlacakan aktivitas operasional klinik.
- Menyediakan aplikasi mobile yang dapat diakses sesuai hak akses masing-masing pengguna.

## Ruang Lingkup Sistem

Ruang lingkup pengembangan SIMKLAB meliputi:

- Pengelolaan data pasien
- Pengelolaan data dokter dan layanan klinik
- Pengelolaan jadwal dan antrian kunjungan (termasuk triase)
- Pengelolaan hasil pemeriksaan (rekam medis) pasien
- Pengelolaan hasil laboratorium
- Pengelolaan pemeriksaan radiologi (ronsen)
- Pengelolaan obat, batch, kartu stok, dan permintaan farmasi
- Pengelolaan alat medis
- Pengelolaan pengadaan (pemasok & purchase order)
- Standardisasi kode diagnosa/tindakan (ICD-10/ICD-9-CM)
- Persetujuan tindakan medis (informed consent)
- Pengelolaan rawat inap dan tempat tidur
- Pengelolaan pembayaran, tagihan, dan kas (pengeluaran + tutup kasir)
- Pengelolaan asuransi/penjamin pasien dan klaim
- Pengelolaan rujukan masuk/keluar dan direktori fasilitas rujukan
- Pengelolaan komunikasi pasien dan survei kepuasan
- Pusat peringatan (stok menipis, obat kedaluwarsa, dsb.)
- Pengelolaan unggahan dokumen
- Laporan operasional & klinis (termasuk laba-rugi)

# Apps_Klinik
- Jejak audit perubahan data
- Manajemen pengguna dan hak akses

Sistem ini berfungsi sebagai aplikasi operasional klinik berbasis mobile yang memusatkan data layanan dalam satu sistem agar proses administrasi dan pelayanan lebih konsisten.

## Arsitektur Sistem

SIMKLAB menggunakan arsitektur three-tier architecture:

```text
Presentation Layer (Aplikasi Mobile - Flutter)
            │
Application Layer (Backend API - Node.js & Express)
            │
Data Layer (MySQL + JSON fallback + Redis cache opsional)
```

Pendekatan ini memudahkan pengembangan, pemeliharaan, serta pengujian sistem secara terpisah. Pada implementasi saat ini, backend menggunakan MySQL sebagai penyimpanan utama, file JSON sebagai fallback/seed data lokal, dan Redis sebagai cache opsional bila tersedia.

## Struktur Direktori Utama

```text
.
├── android/              # Target build Android (Flutter)
├── apps/
│   └── backend/          # REST API Express + TypeScript
├── assets/               # Aset aplikasi Flutter
├── database/             # Schema referensi dan migrasi SQL
├── docker/               # Dockerfile dan Compose terpusat
├── docs/                 # Dokumentasi produk dan teknis
├── ios/                  # Target build iOS (Flutter)
├── lib/                  # Source code aplikasi Flutter
├── packages/
│   ├── config/           # Konfigurasi bersama (TypeScript)
│   ├── database/         # Client MySQL bersama
│   └── types/            # Tipe TypeScript bersama
├── scripts/              # Script otomasi repository
├── test/                 # Unit test Flutter
├── web/                  # Target build web (Flutter)
├── analysis_options.yaml
├── package.json
├── pubspec.yaml
└── README.md
```

### 1. `apps/backend/`

**Fungsi:** Menyediakan REST API, otentikasi, logika bisnis, unggahan dokumen, serta akses data ke MySQL, Redis, dan file JSON cadangan.

**Struktur:**

```text
apps/backend/
├── src/
│   ├── config/         # Konfigurasi aplikasi, logger, MySQL, Redis
│   ├── controllers/    # Penghubung request/response ke service
│   ├── data/           # File JSON fallback/seed data lokal
│   ├── middlewares/    # Error handler dan middleware lain
│   ├── models/         # Store data, default data, abstraksi koleksi
│   ├── routes/         # Endpoint API Express
│   ├── services/       # Logika bisnis utama aplikasi
│   ├── types/          # Definisi tipe data TypeScript
│   ├── utils/          # Helper utilitas umum
│   └── index.ts        # Entry point backend
├── docker-compose.yml
├── package.json
└── uploads/            # File hasil unggahan dokumen
```

- `config/`: Menyimpan konfigurasi aplikasi seperti port, koneksi MySQL, Redis, dan logger.
- `controllers/`: Menangani request dari client dan meneruskan ke layer service.
- `data/`: Berisi file JSON untuk data awal dan fallback jika akses database tidak tersedia.
- `middlewares/`: Berisi handler error dan fungsi middleware backend.
- `models/`: Mengelola inisialisasi datastore, default collection, dan sinkronisasi data.
- `routes/`: Mendefinisikan endpoint seperti auth, pengguna, laporan, asuransi, kasir, rawat inap, pengadaan, persetujuan tindakan, rujukan, peringatan, komunikasi, dokumen, dan backup. Sumber daya master lain didaftarkan generik lewat `registerCollectionRoutes`.
- `services/`: Berisi logika bisnis untuk modul pasien, dokter, farmasi, pengadaan, laporan, dokumen, asuransi, klaim, kasir, rujukan, peringatan, dan lain-lain.
- `types/`: Definisi struktur data utama seperti `Patient`, `Doctor`, `MedicalRecord`, `Medicine`, `PaymentRecord`, dan lainnya.
- `index.ts`: File utama untuk bootstrap server Express.

### 2. `lib/` (Aplikasi Flutter)

**Fungsi:** Menyediakan antarmuka pengguna mobile yang mengonsumsi REST API backend.

**Struktur:**

```text
lib/
├── main.dart           # Entry point aplikasi Flutter
└── src/
    ├── app.dart        # Root widget, tema, dan routing aplikasi
    ├── core/
    │   ├── access/     # Aturan hak akses per role dan registri modul
    │   ├── api/        # HTTP client ke backend
    │   ├── auth/       # State dan helper autentikasi
    │   ├── config/     # Konfigurasi aplikasi (base URL API, dsb.)
    │   ├── router/     # Definisi rute halaman
    │   ├── theme/      # Tema dan gaya visual
    │   └── utils/      # Helper utilitas umum
    ├── data/           # Repository akses koleksi data backend
    ├── features/       # Modul layar: auth, dashboard, antrian, rekam medis,
    │                   # farmasi, kasir, laporan, dokumen, peringatan, dll.
    └── shared/         # Widget reusable lintas modul
```

Unit test aplikasi Flutter berada di folder `test/`.

### 3. `packages/database/`

**Fungsi:** Menyediakan koneksi pool MySQL yang dipakai backend (`src/client.ts`).

> **Skema database dibuat otomatis oleh backend saat start** (lihat `apps/backend/src/models/store.ts`, fungsi `initDataStore`) — backend menjalankan `CREATE TABLE IF NOT EXISTS` untuk seluruh tabel setiap kali dijalankan, jadi **tidak perlu** import SQL manual pada instalasi baru.
>
> Folder `database/schema.sql` berisi dump struktur (tanpa data) yang di-generate dari hasil bootstrap `store.ts` — disediakan sebagai referensi/dokumentasi struktur tabel terkini, bukan wajib diimport. Regenerasi setelah mengubah struktur tabel di `store.ts`: `mysqldump --no-data --skip-comments sistem_klinik > database/schema.sql`.

### 4. File Konfigurasi Root

- `package.json`: Konfigurasi workspace NPM (backend + packages) dan script utama.
- `package-lock.json`: Lockfile dependensi NPM.
- `pubspec.yaml`: Dependensi dan konfigurasi aplikasi Flutter.
- `analysis_options.yaml`: Aturan lint Dart/Flutter.
- `README.md`: Dokumentasi proyek.

## Modul yang Tersedia di Aplikasi

Berdasarkan route backend dan halaman aplikasi Flutter yang ada, modul utama aplikasi ini meliputi:

- Dashboard
- Login, registrasi, dan reset password
- Manajemen pasien
- Manajemen dokter
- Manajemen layanan klinik
- Jadwal dan antrian pasien (dengan triase)
- Pemeriksaan dokter dan rekam medis
- Hasil laboratorium
- Radiologi (ronsen)
- Manajemen obat, kartu stok, dan depo farmasi
- Manajemen alat medis
- Farmasi dan permintaan resep
- Pengadaan (pemasok & purchase order)
- Kode diagnosa/tindakan (ICD)
- Persetujuan tindakan (informed consent)
- Rawat inap, bed, dan visit dokter
- Pembayaran, tagihan, dan kas (pengeluaran + tutup kasir)
- Penjamin/asuransi dan klaim
- Rujukan masuk/keluar dan direktori fasilitas
- Komunikasi pasien dan survei kepuasan
- Pusat peringatan
- Unggahan dan manajemen dokumen
- Laporan klinis dan keuangan (laba-rugi)
- Jejak audit / riwayat aktivitas
- Manajemen pengguna
- Pengaturan klinik

## Endpoint Backend Utama

Backend mengekspos API utama melalui prefix `/api`, di antaranya:

- `/api/auth`
- `/api/users`
- `/api/patients`
- `/api/doctors`
- `/api/services`
- `/api/appointments`
- `/api/medical-records`
- `/api/medicines`
- `/api/medical-equipments`
- `/api/lab-orders`
- `/api/lab-results`
- `/api/radiology-orders`
- `/api/pharmacy-requests`
- `/api/purchase-orders`
- `/api/suppliers`
- `/api/medical-codes`
- `/api/informed-consents`
- `/api/payments`
- `/api/billing-records`
- `/api/insurance-claims`
- `/api/cashier`
- `/api/alerts`
- `/api/reports`
- `/api/insurance`
- `/api/hospital`
- `/api/referrals`
- `/api/workflows`
- `/api/communications`
- `/api/documents`
- `/api/backup`

Endpoint sumber daya master lain (mis. `beds`, `expenses`, `cashier-closings`, `referral-facilities`) diekspos secara generik melalui `registerCollectionRoutes`. Health check tersedia di endpoint `/api/health` (dan `/health`), dokumentasi API di `/api/docs` (Swagger).

## Hak Akses Pengguna

Role yang digunakan pada aplikasi saat ini antara lain:

- `admin`
- `admin-ruangan`
- `dokter`
- `bidan`
- `perawat`
- `apoteker`
- `analis-lab`
- `resepsionis`
- `kasir`
- `manajemen`
- `pasien`
- `super-admin`

Tidak semua menu tersedia untuk seluruh role. Aplikasi Flutter memfilter menu berdasarkan role pengguna yang sedang login (lihat `lib/src/core/access/`).

## Teknologi yang Digunakan

- Backend: Node.js, Express, TypeScript
- Aplikasi Mobile: Flutter, Dart
- Basis Data: MySQL
- Cache: Redis (opsional)
- Upload file: Multer
- Auth dan keamanan: bcryptjs, JSON Web Token
- Container lokal: Docker Compose

## Menjalankan Aplikasi

### 1. Prasyarat

Pastikan perangkat sudah memiliki:

- Node.js 20 atau lebih baru
- NPM
- Flutter SDK (untuk menjalankan aplikasi mobile)
- MySQL 8.x atau MariaDB
- Redis (opsional)
- Docker dan Docker Compose (opsional, untuk setup lokal cepat)

### 2. Instalasi Dependensi

```bash
npm install       # dependensi backend dan packages
flutter pub get   # dependensi aplikasi Flutter
```

Root project menggunakan NPM workspaces untuk `apps/backend` dan `packages/*`.

### 3. Konfigurasi Environment

Repo ini sudah memiliki file environment lokal:

- `apps/backend/.env`

Nilai penting yang digunakan saat ini:

```env
# apps/backend/.env
PORT=4004
FRONTEND_URL=http://localhost:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sistem_klinik
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_jwt_secret_here
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Base URL API untuk aplikasi Flutter dikonfigurasi lewat `lib/src/core/config/`
(atau `--dart-define`) sehingga mengarah ke `http://localhost:4004`.

Jika menggunakan MySQL dari Docker Compose bawaan, backend memakai user `root` tanpa password.

### 4. Menjalankan Backend

```bash
npm run dev:backend
```

Backend berjalan secara default di:

```text
http://localhost:4004
```

### 5. Menjalankan Aplikasi Flutter

```bash
flutter run
```

### 6. Menjalankan Backend Secara Manual

```bash
cd apps/backend
npm run dev
```

## Local MySQL + phpMyAdmin

Jika ingin menjalankan MySQL lokal sementara beserta phpMyAdmin, gunakan file `docker/compose.yml`.

1. Jalankan stack development dari root project (memakai kredensial lokal di
   `docker/dev.env`):

   ```bash
   npm run docker:dev
   ```

2. MySQL tersedia hanya di loopback host pada port `3307` (dipetakan ke port
   `3306` container). Konfigurasi production dan petunjuk deployment VPS ada di
   `docker/README.md`.

3. Salin `apps/backend/.env.example` menjadi `apps/backend/.env`, lalu sesuaikan port database ke port host Docker:

   ```env
   DB_USER=klinik
   DB_PASSWORD=local_app_password
   DB_HOST=127.0.0.1
   DB_PORT=3307
   DB_NAME=sistem_klinik
   ```

4. **Tidak perlu import schema manual pada database kosong.** Cukup jalankan backend (`npm run dev:backend`) — `initDataStore()` akan otomatis membuat seluruh tabel yang dibutuhkan. `database/schema.sql` hanya dump referensi, bukan skrip inisialisasi wajib.

## Script Root yang Tersedia

Di root project, script utama yang tersedia adalah:

```bash
npm run dev            # menjalankan backend mode development
npm run dev:backend
npm run build          # build packages + backend
npm run build:backend
npm run start          # menjalankan backend hasil build
npm run lint
npm test               # test backend (Jest)
npm run docker:up
npm run docker:dev
npm run docker:down
```

Test aplikasi Flutter dijalankan dengan `flutter test`.

## Ringkasan Implementasi Kode

Secara umum, kode aplikasi ini dibangun dengan pola berikut:

- Aplikasi Flutter menangani navigasi halaman, form input, dashboard, dan interaksi pengguna.
- Aplikasi Flutter menggunakan HTTP client di `lib/src/core/api/` untuk berkomunikasi dengan backend melalui endpoint `/api`.
- Backend Express memisahkan routing, controller, dan service agar logika bisnis tidak tercampur dengan handler HTTP.
- Registrasi publik membuat akun `pasien`; pembuatan dan perubahan akun petugas dilakukan oleh admin melalui modul pengguna.
- Data utama diupayakan tersimpan ke MySQL, lalu dicache ke Redis bila tersedia.
- Backend juga menyimpan backup/fallback data ke file JSON dalam `apps/backend/src/data`.
- Dokumen diunggah ke folder `apps/backend/uploads` melalui endpoint dokumen khusus dengan validasi tipe file.

## Ringkasan Modul Aplikasi Flutter

Modul layar utama yang tersedia pada folder `lib/src/features` meliputi:

- `auth` (login, registrasi, lupa password)
- `dashboard`
- `queue` (antrian)
- `medical_records` (pemeriksaan dan rekam medis)
- `pharmacy` (farmasi)
- `cashier` (pembayaran dan kas)
- `documents` (unggahan dokumen)
- `alerts` (pusat peringatan)
- `reports` (laporan)
- `settings` (pengaturan)
- `modules` (modul master data generik)
- `shell` (kerangka navigasi aplikasi)

## Kesimpulan

SIMKLAB merupakan aplikasi klinik dengan aplikasi mobile Flutter dan backend REST API Express. Dengan pemisahan aplikasi mobile, backend, dan database, sistem ini dirancang modular sehingga lebih mudah dikembangkan, diuji, dan dipelihara untuk kebutuhan layanan klinik yang terus berkembang.
