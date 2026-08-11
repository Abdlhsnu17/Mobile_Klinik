"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultData = exports.DEFAULT_SUPER_ADMIN_USER = exports.DEFAULT_ADMIN_USER = void 0;
const medicalCodes_1 = require("./seed/medicalCodes");
const suppliers_1 = require("./seed/suppliers");
exports.DEFAULT_ADMIN_USER = {
    id: "usr-admin-001",
    username: "admin",
    name: "Admin Utama",
    email: "admin@klinik.com",
    role: "admin",
    password: "$2a$10$pjyHVQdl3uWNdh8he3VCDOz1a7gSun7pJKG56rLOmVkfAcOnL6qZ.",
    createdAt: "2026-01-01T00:00:00.000Z",
};
exports.DEFAULT_SUPER_ADMIN_USER = {
    id: "usr-super-admin-001",
    username: "superadmin",
    name: "Super Admin",
    email: "superadmin@klinik.com",
    role: "admin",
    password: "$2a$10$BwgPdpkApXgOu0GaTvfN/uZjaGqfjkzN62nibdV.k4erO2mkFFrx6",
    createdAt: "2026-01-01T00:00:00.000Z",
};
const defaultUsers = [exports.DEFAULT_SUPER_ADMIN_USER, exports.DEFAULT_ADMIN_USER];
const defaultPatients = [];
const defaultDoctors = [];
const defaultServices = [];
const defaultAppointments = [];
const defaultMedicalRecords = [];
const defaultMedicines = [];
const defaultMedicalEquipments = [];
const defaultLabOrders = [];
const defaultLabResults = [];
const defaultPayments = [];
const defaultBillingRecords = [];
const defaultPharmacyRequests = [];
const defaultInsuranceProfiles = [];
const defaultInsuranceBridgeMembers = [];
const defaultInsuranceClaims = [];
const defaultBeds = [
    { id: "bed-anggrek-01", bedNumber: "Bed-01", ward: "Anggrek", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
    { id: "bed-anggrek-02", bedNumber: "Bed-02", ward: "Anggrek", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
    { id: "bed-melati-01", bedNumber: "Bed-01", ward: "Melati", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
    { id: "bed-vip-mawar-01", bedNumber: "Bed-01", ward: "VIP Mawar", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
];
const defaultInpatientAdmissions = [];
const defaultDoctorVisitNotes = [];
const defaultPatientNotifications = [];
const defaultSatisfactionSurveys = [];
const defaultDocuments = [];
const defaultClinicSettings = [];
const defaultAuditLogs = [];
const defaultRadiologyOrders = [];
const defaultClinicalDocuments = [];
const defaultInformedConsents = [];
const defaultReferralFacilities = [];
const defaultReferrals = [];
const defaultPurchaseOrders = [];
const defaultExpenses = [];
const defaultCashierClosings = [];
exports.defaultData = {
    users: defaultUsers,
    patients: defaultPatients,
    doctors: defaultDoctors,
    services: defaultServices,
    medicalCodes: medicalCodes_1.defaultMedicalCodes,
    appointments: defaultAppointments,
    medicalRecords: defaultMedicalRecords,
    medicines: defaultMedicines,
    medicalEquipments: defaultMedicalEquipments,
    labOrders: defaultLabOrders,
    labResults: defaultLabResults,
    payments: defaultPayments,
    billingRecords: defaultBillingRecords,
    passwordResetRequests: [],
    pharmacyRequests: defaultPharmacyRequests,
    insuranceProfiles: defaultInsuranceProfiles,
    insuranceBridgeMembers: defaultInsuranceBridgeMembers,
    insuranceClaims: defaultInsuranceClaims,
    beds: defaultBeds,
    inpatientAdmissions: defaultInpatientAdmissions,
    doctorVisitNotes: defaultDoctorVisitNotes,
    patientNotifications: defaultPatientNotifications,
    satisfactionSurveys: defaultSatisfactionSurveys,
    documents: defaultDocuments,
    clinicSettings: defaultClinicSettings,
    auditLogs: defaultAuditLogs,
    radiologyOrders: defaultRadiologyOrders,
    clinicalDocuments: defaultClinicalDocuments,
    informedConsents: defaultInformedConsents,
    referralFacilities: defaultReferralFacilities,
    referrals: defaultReferrals,
    suppliers: suppliers_1.defaultSuppliers,
    purchaseOrders: defaultPurchaseOrders,
    expenses: defaultExpenses,
    cashierClosings: defaultCashierClosings,
};
//# sourceMappingURL=defaultData.js.map