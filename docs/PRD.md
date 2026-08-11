# Product Requirements Document (PRD)
## SIMKLAB — Sistem Informasi Manajemen Klinik untuk Klinik Rawat Inap Tipe A

| | |
|---|---|
| **Dokumen** | PRD SIMKLAB |
| **Versi** | 1.2 |
| **Tanggal** | 11 Agustus 2026 |
| **Status** | Fase 1–3 terimplementasi; presentation layer bermigrasi ke aplikasi mobile Flutter |

> **Perubahan pada v1.2:** menyesuaikan dokumen dengan hasil refactor struktur proyek —
> (a) presentation layer berpindah dari frontend web Next.js ke **aplikasi mobile Flutter**,
> dan (b) model peran disederhanakan dari 12 peran konseptual menjadi **6 peran teknis**
> yang benar-benar dikenali sistem.

---

## 1. Latar Belakang

Klinik rawat inap tipe A adalah klinik dengan izin rawat inap yang memiliki kapasitas tempat tidur, tenaga medis, dan fasilitas penunjang lebih lengkap dibanding klinik pratama/utama tanpa rawat inap, sebagaimana diatur dalam ketentuan perizinan fasilitas pelayanan kesehatan (Permenkes tentang klinik). Klinik tipe ini wajib mampu menangani rawat jalan, rawat inap terbatas, laboratorium sederhana, farmasi, serta **sistem rujukan** (baik menerima rujukan dari fasilitas kesehatan tingkat pertama maupun merujuk pasien ke rumah sakit rujukan bila kasus di luar kompetensi klinik).

SIMKLAB (Sistem Informasi Manajemen Klinik Abdi) saat ini sudah mengimplementasikan modul inti operasional klinik (pendaftaran, rekam medis, laboratorium, radiologi, farmasi, pengadaan, rawat inap, pembayaran, kas, asuransi). Dokumen ini mendefinisikan kebutuhan produk agar SIMKLAB dapat digunakan secara utuh oleh **klinik rujukan tipe A**. Modul rujukan (referral) yang sebelumnya menjadi kebutuhan baru **kini telah terimplementasi** (Fase 1–3), bersama modul penunjang tipe A lainnya (radiologi, pengadaan, standardisasi kode ICD, persetujuan tindakan, kas & tutup kasir, pusat peringatan).

## 2. Tujuan Produk

1. Menyediakan sistem informasi klinik terpusat yang mendukung seluruh alur layanan dari pendaftaran hingga pembayaran secara digital.
2. Mendukung fungsi klinik tipe A sebagai simpul rujukan: menerima rujukan masuk dari FKTP/klinik jejaring, dan mengeluarkan rujukan ke rumah sakit bila diperlukan.
3. Mendukung pencatatan rekam medis, hasil laboratorium, resep farmasi, dan rawat inap secara terstruktur dan tertelusur (auditable).
4. Menjamin data pasien, dokter, layanan, obat, dan alat medis terkelola secara konsisten dalam satu basis data.
5. Menyediakan kendali akses berbasis peran (role-based access) sesuai tanggung jawab masing-masing tenaga kesehatan dan staf administrasi.
6. Menghasilkan laporan operasional dan klinis yang mendukung pelaporan ke dinas kesehatan/BPJS bila diperlukan.

## 3. Target Pengguna & Peran (Role)

Sistem mengenali **6 peran teknis** (lihat `USER_ROLES` di `packages/types/index.ts` dan
`UserRole` di `lib/src/models/user.dart`). Peran jabatan klinik yang lebih rinci dipetakan
ke salah satu dari enam peran ini agar matriks hak akses tetap sederhana dan dapat diuji.

| Role | Deskripsi Singkat |
|---|---|
| `admin` | Kontrol penuh sistem, konfigurasi klinik, data master, manajemen pengguna, audit log |
| `dokter` | Pemeriksaan, rekam medis, penerbitan rujukan, resep, visit rawat inap |
| `bidan` | Layanan kebidanan dan rekam medis terkait |
| `perawat` | Asuhan keperawatan, visit rawat inap, tanda vital, pengelolaan bed |
| `teknis` | Tenaga teknis penunjang: farmasi, laboratorium, radiologi, alat medis |
| `umum` | Staf umum non-klinis: pendaftaran, antrian, pembayaran, komunikasi pasien |

### 3.1 Pemetaan Jabatan Klinik ke Peran Teknis

| Jabatan operasional | Peran teknis |
|---|---|
| Super admin, admin ruangan, manajemen | `admin` |
| Dokter | `dokter` |
| Bidan | `bidan` |
| Perawat | `perawat` |
| Apoteker, analis laboratorium, radiografer | `teknis` |
| Resepsionis, kasir, pasien | `umum` |

Registrasi publik melalui `/api/auth/register` selalu membuat akun berperan `umum`;
peningkatan peran hanya dapat dilakukan `admin` lewat modul Pengguna.

> **Catatan implementasi:** seed data `apps/backend/src/data/users.json` masih memuat nilai
> peran lama (`super-admin`, `admin-ruangan`). Nilai tersebut tidak dikenali enum peran dan
> akan jatuh ke `umum` saat di-parse aplikasi Flutter, sehingga perlu dinormalisasi ke
> `admin` pada pembersihan data berikutnya.

## 4. Ruang Lingkup

### 4.1 Modul Existing (sudah berjalan di SIMKLAB)
- Manajemen pasien
- Manajemen dokter & layanan klinik
- Jadwal & antrian kunjungan
- Rekam medis
- Laboratorium (order & hasil)
- Manajemen obat & alat medis
- Farmasi & permintaan resep
- Rawat inap (bed, visit dokter)
- Pembayaran & billing
- Asuransi/penjamin
- Komunikasi pasien & survei kepuasan
- Unggahan dokumen
- Laporan
- Manajemen pengguna & hak akses
- Pengaturan klinik

### 4.2 Modul Klinik Tipe A (Terimplementasi Fase 1–3)
- **Manajemen Rujukan (Referral)** — rujukan masuk dan rujukan keluar ✅
- **Direktori Fasilitas Rujukan** — data rumah sakit/FKTP tujuan atau asal rujukan ✅
- **Pelacakan Status Rujukan** — status draft, terkirim, diterima, ditindaklanjuti, ditolak, selesai ✅
- **Surat Rujukan Digital** — pembuatan, cetak, dan riwayat surat rujukan ✅
- **Radiologi (Ronsen)** — order pemeriksaan, hasil (findings/impression), dan review dokter ✅
- **Pengadaan** — pemasok dan purchase order dengan penerimaan barang ✅
- **Standardisasi Kode Diagnosa/Tindakan** — master ICD-10/ICD-9-CM ✅
- **Persetujuan Tindakan (Informed Consent)** — pencatatan, tanda tangan, dan cetak PDF ✅
- **Kas & Keuangan** — pencatatan pengeluaran, tutup kasir, dan laporan laba-rugi ✅
- **Pusat Peringatan** — stok menipis, obat kedaluwarsa, dan peringatan operasional lain ✅

### 4.3 Di Luar Cakupan (Out of Scope)
- Integrasi langsung real-time dengan SATUSEHAT/BPJS (fase berikutnya, disiapkan sebagai ekstensi API)
- Rekam medis elektronik lintas fasilitas (interoperabilitas nasional)
- Modul billing asuransi otomatis penuh (klaim elektronik)
- **Portal pasien mandiri** — peran `pasien` tidak lagi menjadi peran tersendiri setelah penyederhanaan model peran; akses pasien dipetakan ke `umum` dan portal self-service ditunda ke fase lanjutan (lihat `docs/GAP-ANALYSIS.md` gap #3)

## 5. Kebutuhan Fungsional

### 5.1 Modul Rujukan (Terimplementasi)

| ID | Kebutuhan |
|---|---|
| RJ-01 | Dokter dapat membuat surat rujukan keluar dari rekam medis pasien, mencantumkan diagnosis, alasan rujukan, dan fasilitas tujuan |
| RJ-02 | Sistem menyimpan direktori fasilitas rujukan (rumah sakit/klinik jejaring) berikan nama, tipe, alamat, kontak |
| RJ-03 | Resepsionis dapat mencatat rujukan masuk dari FKTP/klinik lain beserta dokumen pendukung |
| RJ-04 | Setiap rujukan memiliki status: `dibuat`, `terkirim`, `diterima`, `ditindaklanjuti`, `ditolak`, `selesai` |
| RJ-05 | Surat rujukan dapat dicetak/diunduh dalam format PDF sesuai kop klinik |
| RJ-06 | Riwayat rujukan pasien dapat dilihat dari halaman rekam medis pasien |
| RJ-07 | Sistem mengirim notifikasi internal saat rujukan baru dibuat atau statusnya berubah |
| RJ-08 | Laporan jumlah dan jenis rujukan (masuk/keluar) dapat difilter berdasarkan periode dan fasilitas tujuan |

### 5.2 Modul Existing — Ringkasan Kebutuhan Fungsional

| ID | Kebutuhan |
|---|---|
| PS-01 | Registrasi dan pengelolaan data pasien (identitas, riwayat kunjungan, alergi) |
| DK-01 | Pengelolaan data dokter, jadwal praktik, dan spesialisasi |
| AN-01 | Pendaftaran antrian rawat jalan dengan nomor urut dan estimasi waktu |
| RM-01 | Pencatatan rekam medis per kunjungan (anamnesis, diagnosis, tindakan) |
| LB-01 | Permintaan pemeriksaan laboratorium dan input hasil oleh analis |
| FR-01 | Permintaan resep dari dokter diteruskan ke farmasi untuk penyiapan obat |
| RI-01 | Pengelolaan tempat tidur/bed, admisi, dan visit dokter selama rawat inap |
| PB-01 | Pencatatan transaksi pembayaran, cetak kuitansi/invoice |
| AS-01 | Pengelolaan data penjamin/asuransi dan verifikasi kepesertaan |
| LP-01 | Laporan kunjungan, pendapatan, dan statistik layanan |
| PG-01 | Manajemen akun pengguna dan hak akses berbasis role |

## 6. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| Keamanan | Autentikasi JWT, password hashing (bcrypt), kontrol akses berbasis role, log audit untuk perubahan data rekam medis dan rujukan |
| Kerahasiaan data | Data pasien dan rekam medis hanya dapat diakses role yang berwenang; unggahan dokumen divalidasi tipe file |
| Ketersediaan | Backend memiliki fallback JSON lokal bila database MySQL tidak tersedia sementara |
| Performa | Cache Redis opsional untuk data yang sering diakses (data master, antrian) |
| Skalabilitas | Arsitektur three-tier (Next.js – Express – MySQL) memungkinkan scaling frontend/backend terpisah |
| Auditability | Setiap perubahan status rujukan dan rekam medis tercatat dengan waktu dan pengguna yang melakukan perubahan |
| Kepatuhan | Struktur data dan alur rujukan mengacu pada ketentuan pelayanan klinik tipe A serta kebutuhan pelaporan ke dinas kesehatan |

## 7. Arsitektur Sistem

Arsitektur tetap *three-tier*, namun presentation layer kini berupa **aplikasi mobile
Flutter** (target build Android, iOS, dan web) menggantikan frontend web Next.js:

```
Presentation Layer (Aplikasi Mobile - Flutter/Dart)
            │  REST /api
Application Layer (Backend API - Node.js & Express + TypeScript)
            │
Data Layer (MySQL + JSON fallback + Redis cache opsional)
```

Application dan data layer tidak berubah — kontrak REST `/api` yang sama dipakai ulang
oleh aplikasi Flutter, sehingga migrasi presentation layer tidak menyentuh logika bisnis.

Modul rujukan mengikuti pola arsitektur yang sama: route `/api/referrals` di backend,
service dan model rujukan, serta layar `/rujukan` pada aplikasi Flutter yang didaftarkan
di `lib/src/core/access/module_registry.dart`.

## 8. Alur Utama (User Flow) — Rujukan Keluar

1. Dokter memeriksa pasien dan mencatat rekam medis.
2. Dokter menentukan pasien perlu dirujuk, memilih fasilitas tujuan dari direktori.
3. Sistem membuat draf surat rujukan otomatis terisi data pasien dan diagnosis.
4. Dokter melengkapi alasan rujukan dan menerbitkan surat.
5. Resepsionis/admin mencetak surat dan menyerahkan ke pasien, status berubah menjadi `terkirim`.
6. Status rujukan dapat diperbarui manual (`diterima`, `ditindaklanjuti`, `selesai`) berdasarkan konfirmasi dari fasilitas tujuan.
7. Riwayat rujukan tersimpan pada rekam medis pasien dan dapat dilaporkan.

## 9. Metrik Keberhasilan

- 100% surat rujukan diterbitkan melalui sistem (tidak manual/kertas terpisah).
- Waktu pembuatan surat rujukan < 3 menit sejak dokter memutuskan rujukan.
- Seluruh rujukan memiliki status yang termutakhirkan dan dapat dilacak dari dashboard.
- Berkurangnya kesalahan input data pasien pada rujukan (data ditarik otomatis dari rekam medis, bukan input ulang).

## 10. Ketergantungan & Risiko

| Risiko | Mitigasi |
|---|---|
| Data fasilitas rujukan tidak lengkap/berubah | Modul direktori rujukan dapat diperbarui admin secara mandiri |
| Belum ada integrasi SATUSEHAT/BPJS untuk rujukan elektronik nasional | Disiapkan sebagai fase lanjutan, sistem saat ini fokus pada pencatatan internal dan surat cetak |
| Ketergantungan pada login role dokter untuk penerbitan rujukan | Audit log dan validasi role pada endpoint `/api/referrals` |

## 11. Rencana Rilis (High-Level)

| Fase | Cakupan | Status |
|---|---|---|
| Fase 1 | Direktori fasilitas rujukan + pencatatan rujukan keluar manual | ✅ Selesai |
| Fase 2 | Rujukan masuk, pelacakan status, notifikasi internal | ✅ Selesai |
| Fase 3 | Cetak surat rujukan PDF, laporan rujukan + modul penunjang tipe A (radiologi, pengadaan, ICD, informed consent, kas, peringatan) | ✅ Selesai |
| Fase 4 (opsional) | Integrasi API SATUSEHAT/BPJS untuk rujukan elektronik | ⏳ Belum |
