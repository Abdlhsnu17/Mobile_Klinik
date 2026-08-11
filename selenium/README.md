# Selenium E2E

Suite ini menguji alur bisnis inti dan memastikan halaman utama Sistem Informasi Klinik (Abdi Care) dapat dibuka menggunakan Chrome.

## Cakupan

- `navigation-smoke.test.mjs`: login, lalu membuka seluruh 19 halaman modul klinik (pendaftaran, rekam medis, layanan klinis, pemeriksaan, rawat inap, laboratorium, rujukan, dokter, farmasi, depo farmasi, pembayaran, asuransi, laporan, alat medis, komunikasi, unggahan, pengguna, pengaturan) melalui klik sidebar, memvalidasi URL, judul, dan label fitur utama tiap halaman, lalu logout.
- `full-regression.test.mjs`: 16 skenario regresi alur bisnis klinik nyata: autentikasi (login valid, password salah, field kosong), pendaftaran pasien → penetapan dokter/layanan → pemeriksaan & resep → pembayaran kasir → penyerahan resep farmasi, alur rawat inap (rekomendasi admisi + penerimaan bed), order & hasil laboratorium, registrasi akun, manajemen pengguna berbasis role (tambah dokter, validasi password, pembatasan role umum, hapus pengguna), dan logout. Rute serta kontrak teks mengikuti struktur modul saat ini (`lib/module-registry.ts`).

## Persiapan

1. Gunakan Node.js sesuai `.nvmrc`.
2. Pastikan Chrome tersedia.
3. Jalankan backend dan frontend, atau jalankan stack Docker.
4. Salin `selenium.env.example.json` menjadi `selenium.env.json` dan isi akun admin khusus pengujian (role `admin`, bukan akun/database produksi). Akun `admin`/`superadmin` bawaan (`apps/backend/src/models/defaultData.ts`) sebaiknya tidak dipakai untuk pengujian otomatis karena kredensialnya bisa berubah kapan saja di database nyata.

`selenium.env.json` dan seluruh screenshot diabaikan Git. Jangan memakai akun atau database produksi.

## Menjalankan

```bash
npm run test:selenium
```

Pilihan suite:

```bash
npm run test:selenium:core
npm run test:selenium:smoke
npm run test:selenium:smoke:headed
npm run test:selenium:core:headed
npm run test:selenium:headed
```

`test:selenium:smoke` membuka setiap fitur melalui klik menu sidebar, lalu
memvalidasi URL, judul, serta label fitur/kolom utama pada setiap halaman.
Urutan kunjungan menu dan pemeriksaan kontrol fitur menggunakan abjad Indonesia
agar hasil headed dan log screenshot mudah diikuti.
`test:selenium:core` menjalankan `full-regression.test.mjs` (16 skenario regresi
alur bisnis, lihat bagian Cakupan). Alias
`npm run selenium:smoke:headed` juga tersedia untuk kompatibilitas.

> Catatan: backend membatasi laju request (`authLimiter` 100/15 menit dan
> `apiLimiter` 3000/15 menit pada mode non-produksi, lihat
> `apps/backend/src/index.ts`). Menjalankan suite berkali-kali secara beruntun
> dapat menghabiskan kuota dan memicu kegagalan `429` yang berantai. Beri jeda
> hingga jendela 15 menit tersebut mereset, atau restart backend, sebelum
> menjalankan ulang.

Variabel opsional:

- `SELENIUM_BASE_URL`, default `http://localhost:3000`.
- `SELENIUM_TIMEOUT_MS`, default `20000` pada mode headless dan `60000` pada
  mode headed agar kompilasi halaman development tidak memicu false timeout.
- `SELENIUM_HEADLESS=false` untuk menampilkan Chrome.
- `SELENIUM_EVIDENCE_DELAY_MS` untuk mengatur lama panel hasil tampil; default
  `2500` ms pada mode headed dan `0` pada mode headless. Panel selalu dihapus
  sebelum skenario berikutnya dimulai agar pesan lama tidak tertinggal.
- `SELENIUM_STEP_DELAY_MS` untuk memberi jeda antarklik, pengisian form, dan
  navigasi; default `600` ms pada mode headed dan `0` pada mode headless.
- `SELENIUM_SCREENSHOT_DIR` untuk mengganti folder artefak.
- `SELENIUM_E2E_USERNAME` dan `SELENIUM_E2E_PASSWORD` sebagai alternatif file konfigurasi.

Gunakan database pengujian terpisah, bukan database produksi: proses yang dihentikan paksa saat menjalankan suite dapat meninggalkan data uji.

Folder screenshot (`selenium/screenshots` secara default, atau `SELENIUM_SCREENSHOT_DIR` bila diisi) dibersihkan otomatis setiap kali salah satu perintah `test:selenium*` dijalankan, sehingga hasil `-fail.png` dari run sebelumnya tidak tertinggal begitu skenario tersebut lulus di run berikutnya.
