import type {
  Appointment,
  AuditLog,
  Bed,
  BillingRecord,
  CashierClosing,
  ClinicSetting,
  ClinicalDocument,
  Doctor,
  DoctorVisitNote,
  DocumentUpload,
  Expense,
  InformedConsent,
  InpatientAdmission,
  InsuranceBridgeMember,
  InsuranceClaim,
  InsuranceProfile,
  LabOrder,
  LabResult,
  MedicalEquipment,
  MedicalRecord,
  Medicine,
  Patient,
  PaymentRecord,
  PharmacyRequest,
  PurchaseOrder,
  PatientNotification,
  RadiologyOrder,
  Referral,
  ReferralFacility,
  SatisfactionSurvey,
  Service,
  User,
} from "../types"
import { defaultMedicalCodes } from "./seed/medicalCodes"
import { defaultSuppliers } from "./seed/suppliers"

export const DEFAULT_ADMIN_USER: User = {
  id: "usr-admin-001",
  username: "admin",
  name: "Admin Utama",
  email: "admin@klinik.com",
  role: "admin",
  password: "$2a$10$pjyHVQdl3uWNdh8he3VCDOz1a7gSun7pJKG56rLOmVkfAcOnL6qZ.",
  createdAt: "2026-01-01T00:00:00.000Z",
}

export const DEFAULT_SUPER_ADMIN_USER: User = {
  id: "usr-super-admin-001",
  username: "superadmin",
  name: "Super Admin",
  email: "superadmin@klinik.com",
  role: "admin",
  password: "$2a$10$BwgPdpkApXgOu0GaTvfN/uZjaGqfjkzN62nibdV.k4erO2mkFFrx6",
  createdAt: "2026-01-01T00:00:00.000Z",
}

const defaultUsers: User[] = [DEFAULT_SUPER_ADMIN_USER, DEFAULT_ADMIN_USER]
const defaultPatients: Patient[] = []
const defaultDoctors: Doctor[] = []
const defaultServices: Service[] = []
const defaultAppointments: Appointment[] = []
const defaultMedicalRecords: MedicalRecord[] = []
const defaultMedicines: Medicine[] = []
const defaultMedicalEquipments: MedicalEquipment[] = []
const defaultLabOrders: LabOrder[] = []
const defaultLabResults: LabResult[] = []
const defaultPayments: PaymentRecord[] = []
const defaultBillingRecords: BillingRecord[] = []
const defaultPharmacyRequests: PharmacyRequest[] = []
const defaultInsuranceProfiles: InsuranceProfile[] = []
const defaultInsuranceBridgeMembers: InsuranceBridgeMember[] = []
const defaultInsuranceClaims: InsuranceClaim[] = []
const defaultBeds: Bed[] = [
  { id: "bed-anggrek-01", bedNumber: "Bed-01", ward: "Anggrek", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
  { id: "bed-anggrek-02", bedNumber: "Bed-02", ward: "Anggrek", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
  { id: "bed-melati-01", bedNumber: "Bed-01", ward: "Melati", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
  { id: "bed-vip-mawar-01", bedNumber: "Bed-01", ward: "VIP Mawar", status: "available", lastCleanedAt: "2026-01-01T00:00:00.000Z", assignedPatientId: null },
]
const defaultInpatientAdmissions: InpatientAdmission[] = []
const defaultDoctorVisitNotes: DoctorVisitNote[] = []
const defaultPatientNotifications: PatientNotification[] = []
const defaultSatisfactionSurveys: SatisfactionSurvey[] = []
const defaultDocuments: DocumentUpload[] = []
const defaultClinicSettings: ClinicSetting[] = []
const defaultAuditLogs: AuditLog[] = []
const defaultRadiologyOrders: RadiologyOrder[] = []
const defaultClinicalDocuments: ClinicalDocument[] = []
const defaultInformedConsents: InformedConsent[] = []
const defaultReferralFacilities: ReferralFacility[] = []
const defaultReferrals: Referral[] = []
const defaultPurchaseOrders: PurchaseOrder[] = []
const defaultExpenses: Expense[] = []
const defaultCashierClosings: CashierClosing[] = []

export const defaultData = {
  users: defaultUsers,
  patients: defaultPatients,
  doctors: defaultDoctors,
  services: defaultServices,
  medicalCodes: defaultMedicalCodes,
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
  suppliers: defaultSuppliers,
  purchaseOrders: defaultPurchaseOrders,
  expenses: defaultExpenses,
  cashierClosings: defaultCashierClosings,
}

export type DefaultData = typeof defaultData
export type CollectionName = keyof DefaultData
