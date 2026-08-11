export const USER_ROLES = [
  "admin",
  "dokter",
  "bidan",
  "perawat",
  "teknis",
  "umum",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export interface User {
  id: string
  username: string
  name: string
  email: string
  role: UserRole
  password: string
  avatarUrl?: string
  createdAt: string
}

export interface Patient {
  id: string
  noRM: string
  nik: string
  name: string
  birthDate: string
  gender: "Laki-laki" | "Perempuan"
  address: string
  phone: string
  email?: string
  bloodType?: "A" | "B" | "AB" | "O" | ""
  allergies?: string
  emergencyContact?: string
  emergencyPhone?: string
  createdAt: string
  updatedAt: string
}

export interface Doctor {
  id: string
  name: string
  specialization: string
  phone: string
  email: string
  schedules: DoctorSchedule[]
  status: "Aktif" | "Tidak Aktif"
  createdAt: string
}

export interface DoctorSchedule {
  day: string
  startTime: string
  endTime: string
}

export interface Service {
  id: string
  name: string
  category: "Konsultasi" | "Pemeriksaan" | "Tindakan" | "Laboratorium" | "Radiologi"
  price: number
  duration: number
  description: string
  status: "Aktif" | "Tidak Aktif"
  /** Spesialisasi dokter yang cocok dengan layanan ini (kosong = berlaku untuk semua spesialisasi) */
  applicableSpecializations?: string[]
}

export interface ClinicSetting {
  id: string
  name: string
  address: string
  phone: string
  email: string
  operationalHours: string
  description: string
  createdAt: string
  updatedAt: string
}

export const APPOINTMENT_STATUSES = ["Menunggu", "Dipanggil", "Diperiksa", "Selesai", "Batal"] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  serviceId: string
  serviceName: string
  serviceIds: string[]
  serviceNames: string[]
  date: string
  time: string
  status: AppointmentStatus
  queueNumber: number
  notes?: string
  triage?: NursingTriage
  createdAt: string
}

export type ClinicalDecision =
  | "outpatient-discharge"
  | "prescription"
  | "lab-required"
  | "radiology-required"
  | "referral"
  | "observation"
  | "inpatient-required"

export interface SoapNote {
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
}

export interface DiagnosisCode {
  code: string
  label: string
  type?: "primary" | "secondary" | "differential"
}

export interface ProcedureCode {
  code: string
  label: string
  category?: "ICD-9-CM" | "internal" | "other"
}

// Master kode klasifikasi klinis terstandar.
// system "icd10" dipakai untuk diagnosa (DiagnosisCode), "icd9cm" untuk tindakan/prosedur (ProcedureCode).
export type MedicalCodeSystem = "icd10" | "icd9cm"

export interface MedicalCode {
  id: string
  system: MedicalCodeSystem
  code: string
  name: string
  category?: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface ClinicalHistory {
  pastIllness?: string
  familyHistory?: string
  currentMedication?: string
  allergyNotes?: string
  immunizationHistory?: string
  riskFactors?: string
}

export interface MedicalRecord {
  id: string
  patientId: string
  appointmentId: string
  doctorId: string
  doctorName: string
  date: string
  diagnosis: string
  symptoms: string
  treatment: string
  soap?: SoapNote
  diagnosisCodes?: DiagnosisCode[]
  procedureCodes?: ProcedureCode[]
  clinicalHistory?: ClinicalHistory
  prescription?: Prescription[]
  equipmentsUsed?: EquipmentUsage[]
  vitalSigns?: VitalSigns
  clinicalDecision?: ClinicalDecision
  referralDestination?: string
  observationNotes?: string
  status?: "draft" | "completed" | "locked"
  lockedAt?: string
  lockedBy?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export type ReferralDirection = "outgoing" | "incoming"
export type ReferralStatus = "draft" | "sent" | "received" | "followed-up" | "rejected" | "completed"

export interface ReferralFacility {
  id: string
  name: string
  type: "rumah-sakit" | "klinik" | "puskesmas" | "lainnya"
  address?: string
  phone?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface Referral {
  id: string
  direction: ReferralDirection
  patientId: string
  patientName: string
  medicalRecordId?: string
  doctorId?: string
  doctorName?: string
  facilityId?: string
  facilityName: string
  diagnosis?: string
  reason: string
  status: ReferralStatus
  supportingDocumentUrl?: string
  notes?: string
  sentAt?: string
  receivedAt?: string
  followedUpAt?: string
  rejectedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ClinicalDocument {
  id: string
  patientId: string
  patientName: string
  medicalRecordId?: string
  type: "medical-resume" | "referral-letter" | "informed-consent" | "control-letter" | "sick-letter"
  title: string
  content: string
  status: "draft" | "final"
  signedBy?: string
  signedAt?: string
  createdAt: string
  updatedAt: string
}

export type InformedConsentType =
  | "tindakan-medis"
  | "tindakan-bedah"
  | "anestesi"
  | "rawat-inap"
  | "transfusi-darah"
  | "persetujuan-umum"
export type InformedConsentGrantedBy = "pasien" | "wali"
export type InformedConsentDecision = "setuju" | "menolak"
export type InformedConsentStatus = "draft" | "signed"

export interface InformedConsent {
  id: string
  patientId: string
  patientName: string
  medicalRecordId?: string
  admissionId?: string
  consentType: InformedConsentType
  procedureName: string
  procedureCode?: string
  doctorId?: string
  doctorName?: string
  // Elemen penjelasan (PMK 290/2008): diagnosis, indikasi, tindakan, risiko, alternatif, prognosis
  diagnosis?: string
  indication?: string
  risks?: string
  alternatives?: string
  prognosis?: string
  // Pemberi persetujuan
  grantedBy: InformedConsentGrantedBy
  guardianName?: string
  guardianRelation?: string
  guardianNik?: string
  witnessName?: string
  decision: InformedConsentDecision
  status: InformedConsentStatus
  signedAt?: string
  signedLocation?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LabOrder {
  id: string
  patientId: string
  patientName: string
  medicalRecordId: string
  admissionId?: string
  doctorId: string
  doctorName: string
  tests: string[]
  priority: "routine" | "urgent"
  status: "requested" | "sample_taken" | "processing" | "completed" | "reviewed" | "cancelled"
  notes?: string
  reviewedAt?: string
  reviewedByDoctorId?: string
  reviewedByDoctorName?: string
  requestedAt: string
  updatedAt: string
}

export interface RadiologyOrder {
  id: string
  patientId: string
  patientName: string
  medicalRecordId: string
  admissionId?: string
  doctorId: string
  doctorName: string
  study: string
  priority: "routine" | "urgent"
  status: "requested" | "scheduled" | "performed" | "reported" | "reviewed" | "cancelled"
  indication?: string
  findings?: string
  impression?: string
  reviewedAt?: string
  reviewedByDoctorId?: string
  reviewedByDoctorName?: string
  requestedAt: string
  updatedAt: string
}

export interface LabResult {
  id: string
  patientId: string
  labOrderId?: string
  testName: string
  resultValue: string
  unit?: string
  notes?: string
  reviewedAt?: string
  reviewedByDoctorId?: string
  reviewedByDoctorName?: string
  performedAt: string
  createdAt: string
}

export type PaymentMethod =
  | "tunai"
  | "transfer-himbara"
  | "qris"
  | "asuransi-swasta"
  | "asuransi-bumn"
  | "asuransi-syariah"
  | "bpjs"

export type PaymentSource = "patient" | "insurance"

export interface PaymentRecord {
  id: string
  medicalRecordId: string
  patientId: string
  amount: number
  method: PaymentMethod
  /** Asal dana: "patient" (bayar sendiri) atau "insurance" (pencairan klaim
   *  asuransi). Dana asuransi tidak dihitung sebagai kas kasir. Default "patient". */
  paymentSource?: PaymentSource
  /** Diisi saat pembayaran berasal dari pencairan sebuah klaim asuransi. */
  insuranceClaimId?: string
  notes?: string
  createdAt: string
  paidAt: string
}

export interface BillingRecord {
  id: string
  medicalRecordId: string
  patientId: string
  patientName: string
  serviceCost: number
  medicineCost: number
  labCost: number
  inpatientCost: number
  equipmentCost: number
  adminCost: number
  discount: number
  insuranceCoverage: number
  total: number
  /** Total pembayaran dari pasien (di luar pencairan asuransi). */
  paidAmount: number
  /** Total dana yang sudah diterima dari pihak asuransi. */
  insurancePaidAmount: number
  status: "draft" | "calculated" | "waiting_payment" | "partially_paid" | "paid" | "claimed_to_insurance" | "cancelled"
  notes?: string
  createdAt: string
  updatedAt: string
}

export type InsuranceClaimStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "approved"
  | "paid"
  | "rejected"

export interface InsuranceClaim {
  id: string
  billingRecordId: string
  medicalRecordId: string
  patientId: string
  patientName: string
  provider: "bpjs" | "asuransi-swasta"
  policyNumber?: string
  /** Nominal yang diajukan ke asuransi (default = insuranceCoverage tagihan). */
  claimedAmount: number
  /** Nominal yang disetujui asuransi (diisi saat status "approved"/"paid"). */
  approvedAmount: number
  status: InsuranceClaimStatus
  /** Id PaymentRecord yang dibuat saat klaim dicairkan (status "paid"). */
  paymentId?: string
  submittedAt?: string
  verifiedAt?: string
  approvedAt?: string
  paidAt?: string
  rejectionReason?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type DocumentCategory =
  | "laporan-barang-masuk"
  | "berita-surat-masuk"
  | "komunikasi-antar-unit"
  | "lainnya"

export interface DocumentUpload {
  id: string
  title: string
  category: DocumentCategory
  description?: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  patientId?: string
  medicalRecordId?: string
  labOrderId?: string
  insuranceClaimId?: string
  uploadedAt: string
  uploader?: string
  createdAt: string
  updatedAt: string
}

export interface Prescription {
  medicineId: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  notes?: string
}

export interface EquipmentUsage {
  equipmentId: string
  equipmentName: string
  usageNotes?: string
}

export interface VitalSigns {
  bloodPressure?: string
  heartRate?: string
  temperature?: string
  bloodGlucose?: string
  oxygenSaturation?: string
  weight?: string
  height?: string
  respiratoryRate?: string
}

export interface NursingTriage {
  vitalSigns: VitalSigns
  complaints?: string
  notes?: string
  nurseName?: string
  recordedAt: string
}

export interface QueueStats {
  totalToday: number
  waiting: number
  inProgress: number
  completed: number
  cancelled: number
}

export interface Medicine {
  id: string
  code: string
  name: string
  genericName: string
  brandName?: string
  category: "Obat Bebas" | "Obat Bebas Terbatas" | "Obat Keras" | "Obat Narkotika"
  form: "Tablet" | "Kapsul" | "Sirup" | "Injeksi" | "Salep" | "Tetes" | "Inhaler"
  strength?: string
  unit: string
  group?: string
  stock: number
  minStock: number
  maxStock?: number
  price: number
  buyPrice?: number
  sellPrice?: number
  manufacturer: string
  supplier?: string
  batchNumber?: string
  expiryDate: string
  location?: string
  barcode?: string
  description?: string
  status: "Tersedia" | "Stok Rendah" | "Habis"
  isActive?: boolean
  requiresPrescription?: boolean
  createdAt: string
  updatedAt: string
  lastStockOpname?: string
  stockOpnameNotes?: string
}

export type StockMovementReason = "dispense" | "adjustment" | "stock-opname" | "receipt"

export interface StockMovement {
  id: string
  medicineId: string
  medicineName?: string
  batchId?: string | null
  batchNumber?: string | null
  quantityChange: number
  reason: StockMovementReason
  referenceId?: string | null
  notes?: string | null
  createdAt: string
}

/**
 * Batch obat yang diterima dari supplier. Stok satu obat bisa terdiri dari
 * beberapa batch dengan tanggal kedaluwarsa berbeda; penyerahan resep
 * mengambil yang paling cepat kedaluwarsa lebih dulu (FEFO).
 */
export interface MedicineBatch {
  id: string
  medicineId: string
  medicineName?: string
  batchNumber: string
  expiryDate: string
  /** Sisa yang masih ada di rak. */
  quantity: number
  /** Jumlah saat batch pertama diterima, dipakai untuk menghitung keterserapan. */
  initialQuantity: number
  buyPrice: number
  supplier?: string | null
  notes?: string | null
  receivedAt: string
  createdAt: string
  updatedAt: string
}

// Ditulis sebagai type alias, bukan interface: interface tidak punya index
// signature implisit sehingga tidak lolos sebagai body request di api-client.
export type ReceiveBatchPayload = {
  batchNumber: string
  expiryDate: string
  quantity: number
  buyPrice?: number
  supplier?: string
  notes?: string
}

/**
 * Koreksi stok manual. "adjustment" mengirim selisih langsung lewat
 * `quantityChange`, "stock-opname" mengirim hasil hitung fisik lewat
 * `countedStock` dan selisihnya dihitung server.
 */
export type StockAdjustmentPayload =
  | { reason: "adjustment"; quantityChange: number; batchId?: string; notes?: string }
  | { reason: "stock-opname"; countedStock: number; batchId?: string; notes?: string }

export type MedicineCategory = Medicine["category"]
export type MedicineForm = Medicine["form"]

export interface NewMedicinePayload {
  name: string
  category: MedicineCategory
  stock: number
  minStock?: number
  price?: number
  sellPrice?: number
  unit?: string
  form?: MedicineForm
  manufacturer?: string
  expiryDate: string
  description?: string
}

export type UpdateMedicinePayload = Partial<NewMedicinePayload & Medicine>

export interface MedicalEquipment {
  id: string
  code: string
  name: string
  category: "Diagnostik" | "Terapeutik" | "Bedah" | "Sterilisasi" | "Monitoring" | "Lainnya"
  brand: string
  model: string
  quantity: number
  condition: "Baik" | "Perlu Perbaikan" | "Rusak"
  location: string
  purchaseDate: string
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  notes?: string
  status: "Tersedia" | "Digunakan" | "Dalam Perawatan" | "Tidak Aktif"
  createdAt: string
  updatedAt: string
}

export interface PharmacyRequest {
  id: string
  medicalRecordId: string
  patientId: string
  patientName: string
  doctorId?: string
  doctorName?: string
  items?: Prescription[]
  prescription?: Prescription[]
  status: "requested" | "processing" | "fulfilled" | "cancelled" | "pending" | "verified" | "dispensed"
  verificationNotes?: string
  dispensingNotes?: string
  requestedAt: string
  fulfilledAt?: string
  updatedAt: string
}

export interface InsuranceProfile {
  id: string
  patientId: string
  patientName: string
  provider: "bpjs" | "asuransi-swasta"
  policyNumber: string
  planName: string
  validUntil: string
  rateMultiplier: number
  coverageNotes?: string
  lastVerifiedAt?: string
  createdAt: string
  updatedAt: string
}

export interface InsuranceBridgeMember {
  id: string
  participantNumber: string
  name: string
  facility: string
  status: "aktif" | "non-aktif"
  coverageLevel: "primer" | "sekunder"
  lastClaimDate: string
}

export interface Bed {
  id: string
  bedNumber: string
  ward: string
  status: "available" | "occupied" | "cleaning" | "maintenance"
  lastCleanedAt: string
  assignedPatientId?: string | null
}

export interface InpatientAdmission {
  id: string
  patientId: string
  patientName: string
  bedId: string
  bedNumber: string
  ward: string
  admittedAt: string
  expectedDischarge?: string
  status: "ongoing" | "discharged" | "pending" | "referred" | "deceased"
  attendingDoctorId?: string
  attendingDoctorName?: string
  notes?: string
  dischargedAt?: string
  dischargeDisposition?: "discharged" | "referred" | "deceased"
  medicalRecordId?: string
  updatedAt: string
}

export interface DoctorVisitNote {
  id: string
  admissionId: string
  doctorId: string
  doctorName: string
  date: string
  note: string
  updatedAt: string
}

export interface PatientNotification {
  id: string
  patientId: string
  patientName: string
  channel: "sms" | "whatsapp" | "email"
  message: string
  targetAt: string
  status: "pending" | "processing" | "sent" | "failed"
  attempts?: number
  sentAt?: string
  lastError?: string
  providerMessageId?: string
  sourceType?: "manual" | "appointment_reminder" | "lab_result"
  sourceId?: string
  createdAt: string
  updatedAt: string
}

export interface SatisfactionSurvey {
  id: string
  patientId: string
  patientName: string
  rating: number
  comments?: string
  submittedAt: string
}

export interface AuditLog {
  id: string
  collection: string
  itemId: string
  action: "create" | "update" | "delete" | "lock" | "status-change"
  userId?: string
  username?: string
  role?: UserRole
  before?: unknown
  after?: unknown
  reason?: string
  createdAt: string
}

export interface PasswordResetRequest {
  id: string
  userId: string
  email: string
  token: string
  expiresAt: string
  used: boolean
  createdAt: string
}

// ── Peringatan operasional (alert & otomatisasi) ─────────────────────────────
export type AlertSeverity = "critical" | "warning"
export type AlertCategory = "stok-menipis" | "obat-kadaluarsa" | "maintenance-alat"
export type AlertReferenceType = "medicine" | "medical-equipment"

export interface OperationalAlert {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  title: string
  detail: string
  referenceId: string
  referenceType: AlertReferenceType
  dueDate?: string
  daysRemaining?: number
  currentValue?: number
  thresholdValue?: number
  unit?: string
}

export interface AlertSummary {
  total: number
  critical: number
  warning: number
  byCategory: Record<AlertCategory, number>
}

export interface OperationalAlertsResponse {
  generatedAt: string
  thresholds: { expiryDays: number; maintenanceDays: number }
  summary: AlertSummary
  alerts: OperationalAlert[]
}

// ── Pengadaan / Procurement (modul keuangan) ─────────────────────────────────
export type SupplierStatus = "aktif" | "nonaktif"

export interface Supplier {
  id: string
  code: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  status: SupplierStatus
  notes?: string
  createdAt: string
  updatedAt?: string
}

export type PurchaseOrderStatus = "draft" | "dipesan" | "diterima-sebagian" | "selesai" | "batal"

export interface PurchaseOrderItem {
  medicineId: string
  medicineName: string
  quantity: number
  unitPrice: number
  receivedQuantity: number
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  status: PurchaseOrderStatus
  orderDate: string
  expectedDate?: string
  items: PurchaseOrderItem[]
  totalAmount: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

// Payload penerimaan barang untuk satu baris PO (menghasilkan batch obat baru).
export interface ReceivePurchaseOrderLine {
  medicineId: string
  receivedQuantity: number
  batchNumber: string
  expiryDate: string
  buyPrice?: number
}

// ── Kas: pengeluaran & tutup kasir (modul keuangan cash-basis) ───────────────
export type ExpenseCategory =
  | "gaji"
  | "sewa"
  | "utilitas"
  | "pembelian-obat"
  | "operasional"
  | "pemeliharaan"
  | "lainnya"

export type CashPaymentMethod = "tunai" | "transfer" | "qris"

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  paymentMethod: CashPaymentMethod
  notes?: string
  recordedBy?: string
  createdAt: string
  updatedAt?: string
}

export interface CashierClosing {
  id: string
  closingDate: string
  cashierName: string
  openingBalance: number
  systemCashTotal: number
  cashExpenseTotal: number
  expectedCashTotal: number
  countedCashTotal: number
  difference: number
  notes?: string
  createdAt: string
}

export interface CashierDailySummary {
  date: string
  systemCashTotal: number
  cashExpenseTotal: number
  nonCashTotal: number
  transactionCount: number
}

export interface ProfitLossReport {
  from?: string
  to?: string
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  expensesByCategory: { category: ExpenseCategory; total: number }[]
}
