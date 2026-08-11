# Gap Analysis & Roadmap — SIMKLAB

> Analisis modul yang masih kurang untuk operasional **klinik rawat inap tipe A** secara utuh, beserta panduan implementasi yang menyesuaikan arsitektur codebase saat ini.
>
> Dibuat: 2026-07-24 · Basis: branch `feat/klinik-pro-fase1-3`

---

## 1. Ringkasan

SIMKLAB sudah mengimplementasikan **hampir seluruh modul operasional inti** (pasien, dokter, layanan, antrian, rekam medis, lab, radiologi, farmasi, alat medis, rawat inap, pembayaran/billing, kasir, asuransi internal, rujukan, pengadaan, kartu stok, dokumen, komunikasi, laporan, pengguna, pengaturan, peringatan, audit log). Modul "baru" pada PRD (Rujukan) pun sudah lengkap termasuk PDF surat rujukan.

Yang tersisa adalah **6 gap** — sebagian regulatif-wajib, sebagian melengkapi role yang sudah didefinisikan tapi belum berfungsi.

| # | Gap | Sifat | Prioritas | Estimasi kasar |
|---|-----|-------|-----------|----------------|
| 1 | Integrasi SATUSEHAT | Regulatif (PMK 24/2022) | 🔴 Wajib | Besar (3–5 minggu) |
| 2 | Integrasi BPJS (P-Care/V-Claim/SEP) | Operasional bila melayani BPJS | 🔴 Wajib bersyarat | Besar (3–5 minggu) |
| 3 | Portal Pasien (role `pasien`) | Fungsional (role sudah ada) | 🟠 Tinggi | Sedang (1–2 minggu) |
| 4 | Informed Consent / Persetujuan Tindakan | Legal-medis | ✅ **SELESAI** | — |
| 5 | Master data ICD-10 / ICD-9-CM | Prasyarat coding & klaim | ✅ **SUDAH ADA** (seed/medicalCodes.ts) | — |
| 6 | Backup & restore terjadwal + retensi | Keamanan data | ✅ **SELESAI** (lihat docs/BACKUP.md) | — |

> **Prasyarat teknis:** Gap #5 mengganjal #1 dan #2 (coding diagnosa dibutuhkan untuk encounter SATUSEHAT & klaim BPJS). Kerjakan #5 lebih dulu meski prioritasnya "sedang".

---

## 2. Pola menambah modul di codebase ini

Untuk gap yang berupa "collection" baru (mis. consent, ICD), ikuti rantai berikut:

1. **`apps/backend/src/models/defaultData.ts`** — tambah nama ke tipe `CollectionName` + tipe record + seed default.
2. **`apps/backend/src/models/store.ts`** — daftarkan di `tableMap`, `tableColumns`, dan (bila ada relasi nested) `detailTables` + fungsi `insertDetails`/`hydrateDetails`. Sertakan DDL `CREATE TABLE` bila membuat tabel baru.
3. **`apps/backend/src/config/collectionPermissions.ts`** — tetapkan `read`/`write` per role.
4. **`apps/backend/src/routes/collections.ts`** — tambah entri di `pathMap` (otomatis membuat CRUD `GET/POST/PUT/DELETE`).
5. **`apps/backend/src/validators/collectionSchemas.ts`** — skema create/update.
6. **Frontend** — `apps/frontend/lib/api-client.ts` + halaman baru di `apps/frontend/app/<nama>/`.

Modul yang butuh logika di luar CRUD generik (mis. panggilan API eksternal SATUSEHAT/BPJS) sebaiknya mengikuti pola **service + route khusus** seperti `referralService.ts` + `routes/referrals.ts`, bukan collection generik.

---

## 3. Detail per gap

### Gap 1 — Integrasi SATUSEHAT 🔴

**Kenapa wajib.** PMK No. 24 Tahun 2022 mewajibkan fasilitas kesehatan menyelenggarakan RME dan mengirim data ke platform **SATUSEHAT** (Kemenkes). Untuk klinik yang benar-benar beroperasi, ini bukan opsional.

**Kondisi saat ini.** Belum ada kode apa pun (`grep satusehat` = kosong). Di PRD tercatat *out of scope* (§4.3) sebagai ekstensi fase berikutnya.

**Ruang lingkup minimum.**
- OAuth2 client-credentials ke SATUSEHAT (token + refresh).
- Master mapping: `Organization`, `Location`, `Practitioner` (dokter → SATUSEHAT ID).
- Kirim **Encounter** dari rekam medis + **Condition** (diagnosis, butuh ICD-10 → Gap #5).
- Kirim hasil **Observation** (lab/TTV) dan **MedicationRequest** (resep) — bertahap.
- Simpan `satusehatId` & status sinkronisasi per entitas; retry queue untuk gagal kirim.

**Pendekatan di codebase ini.**
- Modul terpisah: `apps/backend/src/services/satusehatService.ts` + `routes/satusehat.ts`.
- Konfigurasi kredensial di `config/appConfig.ts` (pola sama seperti `SMTP_CONFIG`/`WHATSAPP_GATEWAY`).
- Tambah kolom `satusehatId`/`syncStatus` pada koleksi terkait (patients, medicalRecords, users/doctors).
- Job async untuk push (mirip pola `realtimeService`/`notificationService`).

**Dependency.** Kredensial sandbox SATUSEHAT, NIK/IHS pasien tervalidasi, Gap #5 (ICD-10).

**Estimasi.** 3–5 minggu (mulai dari sandbox Encounter+Condition).

---

### Gap 2 — Integrasi BPJS (P-Care / V-Claim / SEP) 🔴 bersyarat

**Kenapa wajib.** Bila klinik melayani peserta JKN, penerbitan **SEP** dan bridging **P-Care** (FKTP) atau **V-Claim** (rujukan/RITL) diperlukan agar klaim dapat diproses.

**Kondisi saat ini.** Modul asuransi (`insuranceService`, `insuranceProfiles`, `insuranceBridgeMembers`) hanya pencatatan & klaim **manual** internal. Tidak ada bridging API BPJS riil.

**Ruang lingkup minimum.**
- Enkripsi/signature khusus BPJS (timestamp + HMAC + LZ-string decrypt respons).
- Cek kepesertaan (by NIK/No. Kartu), penerbitan **SEP**, dan pengiriman klaim.
- Kaitkan `sepNumber` ke `billingRecords`/`insuranceProfiles`.

**Pendekatan.** Modul terpisah `services/bpjsService.ts` + `routes/bpjs.ts`; kredensial (cons ID, secret key, user key) di `appConfig.ts`. Manfaatkan ulang `insuranceBridgeMembers` yang sudah ada untuk mapping peserta.

**Dependency.** Kredensial BPJS (cons-id/secret) — hanya diberikan ke faskes berkontrak. **Tandai bersyarat**: kerjakan hanya bila klinik memang melayani BPJS.

**Estimasi.** 3–5 minggu.

---

### Gap 3 — Portal Pasien (role `pasien`) 🟠

**Kenapa penting.** Role `pasien` sudah didefinisikan di PRD (§3) dan sistem auth ("akses jadwal, hasil, riwayat terbatas"), tetapi **tidak ada halaman portal** untuk role ini di `apps/frontend/app/`. Role ada, UI belum → fitur menggantung.

**Ruang lingkup minimum.**
- Halaman portal read-only: jadwal/antrian pasien tsb, hasil lab/radiologi yang sudah final, riwayat kunjungan, tagihan.
- Pembatasan data ketat: pasien hanya boleh melihat **datanya sendiri** (bukan seluruh koleksi).

**Pendekatan.**
- Frontend: rute `apps/frontend/app/portal/` yang render terbatas untuk role `pasien`; sesuaikan nav/guard.
- Backend: karena `collectionPermissions` bersifat per-koleksi (bukan per-baris), tambahkan **filter kepemilikan** — endpoint khusus `routes/portal.ts` yang memfilter berdasarkan `patientId` dari user terautentikasi, **jangan** cukup memberi role `pasien` akses read koleksi penuh.
- Kaitkan akun user `pasien` ke `patientId`.

**Dependency.** Model relasi user↔patient. **Catatan keamanan:** ini gap keamanan bila salah — pastikan otorisasi tingkat baris.

**Estimasi.** 1–2 minggu.

---

### Gap 4 — Informed Consent / Persetujuan Tindakan Medis 🟠

**Kenapa penting.** Persetujuan tindakan (PMK 290/2008) adalah dokumen legal wajib untuk tindakan medis tertentu (bedah, anestesi, rawat inap, transfusi). Belum ada alur terstruktur.

**Kondisi saat ini.** Ada koleksi generik `clinicalDocuments`, tapi bukan alur consent (jenis tindakan, pemberi persetujuan, saksi, tanda tangan, waktu).

**Pendekatan (collection baru — ikuti §2).**
- Koleksi `informedConsents`: `patientId`, `medicalRecordId`, `procedure`, `consentType` (tindakan/anestesi/rawat inap/penolakan), `grantedBy` (pasien/wali + hubungan), `witness`, `doctorId`, `signedAt`, `status`, lampiran.
- Cetak PDF (pakai ulang pola `referralPdfService.ts`/`pdfReportService.ts`).
- Tautkan dari halaman rekam medis (`app/pemeriksaan`) dan rawat inap.

**Estimasi.** 3–5 hari.

---

### Gap 5 — Master data ICD-10 / ICD-9-CM 🟡 (prasyarat #1 & #2)

**Kondisi saat ini.** Koleksi `medicalCodes` (frontend: `app/kode-diagnosa`) sudah punya rute & permission, tetapi **seed datanya kosong** (`medicalRecords.json` & kode terkait `[]`). Tanpa ini, coding diagnosa/tindakan tidak bisa dipakai untuk klaim maupun SATUSEHAT.

**Pendekatan.**
- Isi seed `medicalCodes` dengan ICD-10 (diagnosis) & ICD-9-CM (tindakan) — minimal subset yang sering dipakai klinik, dilengkapi bertahap.
- Bedakan `codeType: "ICD-10" | "ICD-9-CM"` pada skema.
- Sumber data: rilis WHO ICD-10 / dataset publik; muat via seed atau import CSV (util `utils/csv.ts` sudah ada).

**Estimasi.** 1–2 hari (subset), lebih bila full dataset.

> **Kerjakan lebih dulu** — memblokir #1 dan #2.

---

### Gap 6 — Backup & Restore terjadwal + retensi data 🟡

**Kenapa penting.** Data medis wajib punya kebijakan backup & retensi. Saat ini hanya ada `utils/csv.ts` (export ad-hoc); tidak ada backup/restore terjadwal.

**Pendekatan.**
- Script/job `mysqldump` terjadwal (backend berbasis MySQL) + rotasi.
- Endpoint admin untuk export/import penuh (dibatasi role `super-admin`/`admin`).
- Dokumentasikan kebijakan retensi di `docs/`.

**Estimasi.** 3–5 hari.

---

## 4. Roadmap yang disarankan

| Fase | Isi | Alasan urutan |
|------|-----|----------------|
| **A (cepat)** | ✅ **SELESAI** — Gap #5 (ICD, sudah ada) · #4 (consent) · #6 (backup) | Cepat, berdampak langsung, dan #5 membuka jalan integrasi |
| **B** | Gap #3 (Portal Pasien) | Melengkapi role yang sudah ada; nilai tambah pasien |
| **C** | Gap #1 (SATUSEHAT) | Regulatif; butuh #5 selesai + kredensial sandbox |
| **D (bersyarat)** | Gap #2 (BPJS) | Hanya bila klinik melayani JKN; butuh kredensial faskes |

---

## 5. Catatan

- Penilaian ini berbasis struktur kode, bukan status regulasi klinik yang sebenarnya. **Prioritas riil bergantung pada:** (a) apakah klinik melayani BPJS, dan (b) status/target sertifikasi RME & kewajiban SATUSEHAT klinik tersebut.
- Gap #1 & #2 di-*out of scope*-kan oleh PRD saat ini — bila memang menargetkan operasional penuh, PRD perlu direvisi untuk memasukkannya.
