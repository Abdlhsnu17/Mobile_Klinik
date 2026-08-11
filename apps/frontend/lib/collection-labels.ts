/**
 * Nama koleksi yang disimpan backend (lihat models/defaultData.ts) dalam bentuk
 * yang bisa dibaca staf klinik. Dipakai di Riwayat Aktivitas agar tabel tidak
 * menampilkan identifier teknis seperti "inpatientAdmissions".
 */
export const COLLECTION_LABELS: Record<string, string> = {
  users: "Pengguna",
  patients: "Pasien",
  doctors: "Dokter",
  services: "Layanan Klinis",
  appointments: "Pendaftaran & Antrian",
  medicalRecords: "Rekam Medis",
  medicines: "Obat",
  medicalEquipments: "Alat Medis",
  labOrders: "Order Laboratorium",
  labResults: "Hasil Laboratorium",
  radiologyOrders: "Order Radiologi",
  clinicalDocuments: "Dokumen Klinis",
  referrals: "Rujukan",
  referralFacilities: "Fasilitas Rujukan",
  payments: "Pembayaran",
  billingRecords: "Tagihan",
  passwordResetRequests: "Permintaan Reset Kata Sandi",
  pharmacyRequests: "Permintaan Farmasi",
  insuranceProfiles: "Profil Asuransi",
  insuranceClaims: "Klaim Asuransi",
  insuranceBridgeMembers: "Peserta Asuransi",
  beds: "Tempat Tidur",
  inpatientAdmissions: "Admisi Rawat Inap",
  doctorVisitNotes: "Catatan Visit Dokter",
  patientNotifications: "Notifikasi Pasien",
  satisfactionSurveys: "Survei Kepuasan",
  clinicSettings: "Pengaturan Klinik",
  documents: "Unggahan Dokumen",
  auditLogs: "Riwayat Aktivitas",
};
