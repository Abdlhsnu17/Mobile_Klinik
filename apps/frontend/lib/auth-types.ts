import type { User } from "../../backend/src/types"

export type {
  AlertCategory,
  AlertSeverity,
  AlertSummary,
  Appointment,
  AuditLog,
  Bed,
  CashierClosing,
  CashierDailySummary,
  CashPaymentMethod,
  Expense,
  ExpenseCategory,
  OperationalAlert,
  OperationalAlertsResponse,
  ProfitLossReport,
  BillingRecord,
  ClinicalDecision,
  ClinicSetting,
  Doctor,
  DoctorSchedule,
  DiagnosisCode,
  DoctorVisitNote,
  DocumentCategory,
  DocumentUpload,
  EquipmentUsage,
  InformedConsent,
  InformedConsentDecision,
  InformedConsentGrantedBy,
  InformedConsentStatus,
  InformedConsentType,
  InpatientAdmission,
  InsuranceBridgeMember,
  InsuranceClaim,
  InsuranceClaimStatus,
  InsuranceProfile,
  LabOrder,
  LabResult,
  MedicalCode,
  MedicalCodeSystem,
  MedicalEquipment,
  MedicalRecord,
  Medicine,
  MedicineBatch,
  Patient,
  ProcedureCode,
  PatientNotification,
  PaymentMethod,
  PaymentRecord,
  PharmacyRequest,
  Prescription,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  RadiologyOrder,
  ReceiveBatchPayload,
  ReceivePurchaseOrderLine,
  Referral,
  ReferralDirection,
  ReferralFacility,
  ReferralStatus,
  SatisfactionSurvey,
  Service,
  StockAdjustmentPayload,
  StockMovement,
  Supplier,
  SupplierStatus,
  User,
  UserRole,
  VitalSigns,
} from "../../backend/src/types"

export type SafeUser = Omit<User, "password"> & {
  avatar?: string | null
}

export type PaymentSummary = {
  id: string
  patientId: string
  patientName: string
  serviceName: string
  serviceDetails?: string
  category: string
  date: string
  visitDate?: string
  treatment: string
  medicines: string[]
  serviceCost: number
  medicineCost: number
  total: number
  totalAmount?: number
}
