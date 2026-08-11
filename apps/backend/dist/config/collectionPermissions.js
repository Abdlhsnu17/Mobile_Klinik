"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionPermissions = void 0;
// Role disederhanakan menjadi 6: admin, dokter, bidan, perawat, teknis, umum.
// (super-admin/admin-ruangan/manajemen -> admin, apoteker/analis-lab -> teknis,
// resepsionis/kasir/pasien -> umum)
const ALL_ROLES = ["admin", "dokter", "bidan", "perawat", "teknis", "umum"];
const CLINICAL_STAFF = ["admin", "dokter", "bidan", "perawat", "teknis"];
exports.collectionPermissions = {
    users: { read: ["admin"], write: ["admin"] },
    documents: { read: ["admin"], write: ["admin"] },
    patients: { read: ["admin", "dokter", "bidan", "perawat", "teknis", "umum"], write: ["admin", "umum", "dokter", "bidan", "perawat"] },
    doctors: { read: ALL_ROLES, write: ["admin"] },
    services: { read: ALL_ROLES, write: ["admin"] },
    // Master kode ICD-10/ICD-9-CM: dibaca seluruh staf klinis untuk lookup saat
    // pemeriksaan, dikelola (tulis) oleh admin sebagai tata kelola data acuan.
    medicalCodes: { read: ALL_ROLES, write: ["admin"] },
    appointments: {
        read: ["admin", "umum", "dokter", "bidan", "perawat"],
        write: ["admin", "umum", "dokter", "bidan", "perawat"],
    },
    medicalRecords: {
        read: ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
        write: ["admin", "dokter", "bidan"],
    },
    medicines: { read: ["admin", "teknis", "dokter", "bidan", "perawat", "umum"], write: ["admin", "teknis"] },
    medicalEquipments: {
        read: ["admin", "perawat", "dokter", "bidan"],
        write: ["admin"],
    },
    labOrders: {
        read: CLINICAL_STAFF,
        write: ["admin", "dokter", "bidan", "teknis"],
    },
    labResults: {
        read: CLINICAL_STAFF,
        write: ["admin", "teknis"],
    },
    // Disamakan dengan labOrders: radiografer memakai role "teknis", sehingga tanpa
    // ini mereka tidak bisa menjadwalkan maupun mengisi hasil bacaan radiologi.
    radiologyOrders: {
        read: CLINICAL_STAFF,
        write: ["admin", "dokter", "bidan", "perawat", "teknis"],
    },
    clinicalDocuments: {
        read: ["admin", "dokter", "bidan", "perawat", "umum"],
        write: ["admin", "dokter", "bidan", "umum"],
    },
    informedConsents: {
        read: ["admin", "dokter", "bidan", "perawat", "umum"],
        write: ["admin", "dokter", "bidan", "perawat", "umum"],
    },
    referralFacilities: { read: ALL_ROLES, write: ["admin", "umum"] },
    // referrals menggunakan custom router (routes/referrals.ts) karena punya state machine status,
    // bukan generic collection route -> entri ini tak dipakai tapi wajib ada agar Record tetap exhaustive.
    referrals: { read: ALL_ROLES, write: ["admin", "dokter", "umum"] },
    payments: { read: ALL_ROLES, write: ["admin", "umum"] },
    billingRecords: {
        read: ALL_ROLES,
        write: ["admin", "umum"],
    },
    passwordResetRequests: { read: ["admin"], write: ["admin"] },
    pharmacyRequests: { read: ["admin", "teknis", "dokter", "bidan", "perawat", "umum"], write: ["admin", "teknis"] },
    insuranceProfiles: { read: ["admin", "umum", "dokter", "bidan"], write: ["admin", "umum"] },
    insuranceBridgeMembers: { read: ["admin", "umum"], write: ["admin"] },
    // insuranceClaims memakai custom router (routes/insurance.ts) karena punya state machine
    // status klaim -> entri ini tak dipakai route generic tapi wajib ada agar Record exhaustive.
    insuranceClaims: { read: ["admin", "umum"], write: ["admin", "umum"] },
    beds: { read: ["admin", "perawat", "dokter", "bidan"], write: ["admin", "perawat"] },
    inpatientAdmissions: {
        read: ["admin", "perawat", "dokter", "bidan"],
        write: ["admin", "perawat", "dokter", "bidan"],
    },
    doctorVisitNotes: { read: ["admin", "dokter", "bidan", "perawat"], write: ["admin", "dokter", "bidan"] },
    patientNotifications: { read: ["admin", "umum"], write: ["admin", "umum"] },
    satisfactionSurveys: { read: ["admin", "umum"], write: ["admin", "umum"] },
    clinicSettings: { read: ALL_ROLES, write: ["admin"] },
    auditLogs: { read: ["admin"], write: ["admin"] },
    // Pengadaan farmasi dikelola admin & tenaga teknis (apoteker).
    suppliers: { read: ["admin", "teknis"], write: ["admin", "teknis"] },
    purchaseOrders: { read: ["admin", "teknis"], write: ["admin", "teknis"] },
    // Kas dikelola admin & kasir (role umum).
    expenses: { read: ["admin", "umum"], write: ["admin", "umum"] },
    cashierClosings: { read: ["admin", "umum"], write: ["admin", "umum"] },
};
//# sourceMappingURL=collectionPermissions.js.map