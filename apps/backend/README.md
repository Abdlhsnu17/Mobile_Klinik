# Backend Workflow API

Dokumen ini menjelaskan endpoint orkestrasi alur klinik yang ditambahkan di backend.

Base path:

- `/api/workflows`

## 1. Registrasi Kunjungan

- `POST /api/workflows/visits/register`
- Role: `admin`, `admin-ruangan`, `resepsionis`, `dokter`, `bidan`, `perawat`

Request:

```json
{
  "patientId": "patient-001",
  "doctorId": "doctor-001",
  "date": "2026-07-09",
  "time": "08:00",
  "serviceId": "service-001",
  "serviceIds": ["service-001", "service-002"],
  "notes": "Kontrol rutin"
}
```

Response `201`:

```json
{
  "id": "appointment-id",
  "patientId": "patient-001",
  "doctorId": "doctor-001",
  "status": "Menunggu",
  "queueNumber": 12
}
```

## 2. Mulai Pemeriksaan

- `POST /api/workflows/visits/:appointmentId/start-exam`
- Role: `admin`, `admin-ruangan`, `resepsionis`, `dokter`, `bidan`, `perawat`

Response `200`: appointment dengan status `Diperiksa`.

## 3. Selesai Pemeriksaan

- `POST /api/workflows/visits/:appointmentId/finish-exam`
- Role: `admin`, `admin-ruangan`, `resepsionis`, `dokter`, `bidan`, `perawat`

Request minimal:

```json
{
  "diagnosis": "Gastritis akut",
  "symptoms": "Nyeri ulu hati",
  "treatment": "Antasida",
  "clinicalDecision": "prescription"
}
```

Request opsional yang didukung:

- `doctorId`, `doctorName`
- `soap`, `diagnosisCodes`, `procedureCodes`, `clinicalHistory`
- `prescription`, `equipmentsUsed`, `vitalSigns`
- `referralDestination`, `observationNotes`, `notes`

Response `200`:

```json
{
  "appointmentId": "appointment-id",
  "medicalRecord": {
    "id": "medical-record-id",
    "status": "completed"
  }
}
```

Efek samping endpoint:

- Status appointment otomatis menjadi `Selesai`.
- Sinkronisasi otomatis ke farmasi, lab order, billing, dan pemakaian alat medis.

## 4. Finalisasi Rekam Medis

- `POST /api/workflows/medical-records/:medicalRecordId/finalize`
- Role: `admin`, `admin-ruangan`, `dokter`, `bidan`

Request opsional:

```json
{
  "reason": "Dokumen klinis final"
}
```

Response `200`: medical record dengan status `locked`.

## 5. Sinkronisasi Billing

- `POST /api/workflows/billing/sync/:medicalRecordId`
- Role: `admin`, `admin-ruangan`, `resepsionis`, `kasir`

Response `200`: objek billing record terbaru.

## 6. Pembayaran

- `POST /api/workflows/payments`
- Role: `admin`, `admin-ruangan`, `resepsionis`, `kasir`

Request:

```json
{
  "medicalRecordId": "medical-record-id",
  "patientId": "patient-001",
  "amount": 150000,
  "method": "tunai",
  "notes": "Pelunasan tahap 1"
}
```

Response `201`: payment record baru.

## 7. Workflow Farmasi

### 7.1 Buat request farmasi dari rekam medis

- `POST /api/workflows/pharmacy/requests`
- Role: `admin`, `admin-ruangan`, `apoteker`, `dokter`, `bidan`, `perawat`

Request:

```json
{
  "medicalRecordId": "medical-record-id"
}
```

Response `201`: pharmacy request.

### 7.2 Verifikasi request farmasi

- `POST /api/workflows/pharmacy/requests/:id/verify`
- Role: `admin`, `admin-ruangan`, `apoteker`, `dokter`, `bidan`, `perawat`

Request opsional:

```json
{
  "notes": "Resep sesuai"
}
```

Response `200`: pharmacy request dengan status `verified`.

### 7.3 Proses request farmasi

- `POST /api/workflows/pharmacy/requests/:id/process`
- Role: `admin`, `admin-ruangan`, `apoteker`, `dokter`, `bidan`, `perawat`

Request opsional:

```json
{
  "notes": "Obat sedang disiapkan"
}
```

Response `200`: pharmacy request dengan status `processing`.

### 7.4 Dispense obat

- `POST /api/workflows/pharmacy/requests/:id/dispense`
- Role: `admin`, `admin-ruangan`, `apoteker`, `dokter`, `bidan`, `perawat`

Request opsional:

```json
{
  "notes": "Obat diserahkan lengkap"
}
```

Response `200`: pharmacy request dengan status `dispensed`.

### 7.5 Batalkan request farmasi

- `POST /api/workflows/pharmacy/requests/:id/cancel`
- Role: `admin`, `admin-ruangan`, `apoteker`, `dokter`, `bidan`, `perawat`

Request opsional:

```json
{
  "notes": "Retur obat"
}
```

Response `200`: pharmacy request dengan status `cancelled`.

Efek samping endpoint:

- Mengurangi stok obat saat `dispense`.
- Mengembalikan stok obat saat `cancel` dari status `dispensed/fulfilled`.
- Menulis `stock_movements`.
- Sinkronisasi billing rekam medis terkait.

## Catatan Integrasi Frontend

Integrasi frontend sudah menggunakan helper baru di:

- `apps/frontend/lib/api-client.ts`
- `apps/frontend/lib/clinic-utils.ts`

Halaman yang sudah dipindahkan ke workflow API:

- `apps/frontend/app/antrian/page.tsx`
- `apps/frontend/app/pemeriksaan/page.tsx`
- `apps/frontend/app/farmasi/page.tsx`
