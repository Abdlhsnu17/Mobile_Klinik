import type { FinancialSummary, MorbidityEntry, ReferralStats, VisitCounts } from "./api-client";
import { apiClient, isForbiddenApiError } from "./api-client";
import {
    createPatient as createPatientApi,
    deletePatient as deletePatientApi,
    generateNoRM as generateNoRMApi,
    getPatient as getPatientApi,
    getPatients as getPatientsApi,
    updatePatient as updatePatientApi,
} from "./api/patients";
import type {
    Appointment,
    AuditLog,
    Bed,
    BillingRecord,
    CashierClosing,
    ClinicSetting,
    Doctor,
    DoctorVisitNote,
    DocumentCategory,
    DocumentUpload,
    Expense,
    InformedConsent,
    InpatientAdmission,
    InsuranceBridgeMember,
    InsuranceClaim,
    InsuranceClaimStatus,
    InsuranceProfile,
    LabOrder,
    LabResult,
    MedicalCode,
    MedicalEquipment,
    MedicalRecord,
    Medicine,
    MedicineBatch,
    Patient,
    PatientNotification,
    PaymentRecord,
    PaymentSummary,
    PharmacyRequest,
    ProfitLossReport,
    PurchaseOrder,
    RadiologyOrder,
    ReceiveBatchPayload,
    ReceivePurchaseOrderLine,
    Referral,
    ReferralFacility,
    SatisfactionSurvey,
    Service,
    StockAdjustmentPayload,
    StockMovement,
    Supplier,
} from "./auth-types";

// Cache untuk mengurangi API calls (optional optimization)
type CacheEntry<T> = {
  data: T
  timestamp: number
}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
export const CLINIC_DATA_CHANGED_EVENT = "clinic-data-changed"

class DataCache {
  private entries = new Map<string, CacheEntry<unknown>>()
  private changeEventScheduled = false

  private notifyDataChanged(): void {
    if (typeof window === "undefined" || this.changeEventScheduled) return
    this.changeEventScheduled = true
    queueMicrotask(() => {
      this.changeEventScheduled = false
      window.dispatchEvent(new Event(CLINIC_DATA_CHANGED_EVENT))
    })
  }

  private isExpired(entry: CacheEntry<unknown> | undefined): boolean {
    if (!entry) return true
    return Date.now() - entry.timestamp > CACHE_DURATION
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.entries.get(key)
    if (this.isExpired(entry)) {
      this.entries.delete(key)
      return null
    }
    return (entry?.data as T) ?? null
  }

  set<T>(key: string, data: T): void {
    this.entries.set(key, { data, timestamp: Date.now() })
  }

  clear(key?: string): void {
    if (key) {
      this.entries.delete(key)
    } else {
      this.entries.clear()
    }
    this.notifyDataChanged()
  }
}

const cache = new DataCache()

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function normalizeDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}(?:$|\s)/.test(value)) return value.slice(0, 10)

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : getLocalDateKey(parsed)
}

// Patient functions
export async function getPatients(): Promise<Patient[]> {
  return getPatientsApi()
}

export async function getPatient(id: string): Promise<Patient> {
  return getPatientApi(id)
}

export async function createPatient(patient: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<Patient> {
  return createPatientApi(patient)
}

export async function updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
  return updatePatientApi(id, patient)
}

export async function deletePatient(id: string): Promise<void> {
  await deletePatientApi(id)
}

export async function generateNoRM(): Promise<string> {
  return generateNoRMApi()
}

// Doctor functions
export async function getDoctors(): Promise<Doctor[]> {
  const cached = cache.get<Doctor[]>("doctors")
  if (cached) return cached
  
  const data = await apiClient.getDoctors()
  cache.set("doctors", data)
  return data
}

export async function getDoctor(id: string): Promise<Doctor> {
  return apiClient.getDoctor(id)
}

export async function createDoctor(doctor: Omit<Doctor, "id" | "createdAt">): Promise<Doctor> {
  const newDoctor = await apiClient.createDoctor(doctor)
  cache.clear("doctors")
  return newDoctor
}

export async function updateDoctor(id: string, doctor: Partial<Doctor>): Promise<Doctor> {
  const updated = await apiClient.updateDoctor(id, doctor)
  cache.clear("doctors")
  return updated
}

export async function deleteDoctor(id: string): Promise<void> {
  await apiClient.deleteDoctor(id)
  cache.clear("doctors")
}

// Service functions
export async function getServices(): Promise<Service[]> {
  const cached = cache.get<Service[]>("services")
  if (cached) return cached
  
  const data = await apiClient.getServices()
  cache.set("services", data)
  return data
}

export async function getService(id: string): Promise<Service> {
  return apiClient.getService(id)
}

export async function createService(service: Omit<Service, "id">): Promise<Service> {
  const newService = await apiClient.createService(service)
  cache.clear("services")
  return newService
}

export async function updateService(id: string, service: Partial<Service>): Promise<Service> {
  const updated = await apiClient.updateService(id, service)
  cache.clear("services")
  return updated
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.deleteService(id)
  cache.clear("services")
}

export async function getClinicSettings(): Promise<ClinicSetting[]> {
  const cached = cache.get<ClinicSetting[]>("clinicSettings")
  if (cached) return cached

  const data = await apiClient.getClinicSettings()
  cache.set("clinicSettings", data)
  return data
}

export async function createClinicSetting(
  payload: Omit<ClinicSetting, "id" | "createdAt" | "updatedAt">,
): Promise<ClinicSetting> {
  const created = await apiClient.createClinicSetting(payload)
  cache.clear("clinicSettings")
  return created
}

export async function updateClinicSetting(id: string, payload: Partial<ClinicSetting>): Promise<ClinicSetting> {
  const updated = await apiClient.updateClinicSetting(id, payload)
  cache.clear("clinicSettings")
  return updated
}

// Appointment functions
export async function getAppointments(): Promise<Appointment[]> {
  const cached = cache.get<Appointment[]>("appointments")
  if (cached) return cached

  try {
    const data = await apiClient.getAppointments()
    cache.set("appointments", data)
    return data
  } catch (error) {
    if (isForbiddenApiError(error)) {
      return []
    }
    throw error
  }
}

export async function getAppointment(id: string): Promise<Appointment> {
  return apiClient.getAppointment(id)
}

export async function createAppointment(appointment: Omit<Appointment, "id" | "createdAt">): Promise<Appointment> {
  const newAppointment = await apiClient.createAppointment(appointment)
  cache.clear("appointments")
  return newAppointment
}

export async function registerVisitWorkflow(payload: {
  patientId: string
  doctorId?: string
  date: string
  time: string
  serviceId?: string
  serviceIds?: string[]
  notes?: string
}): Promise<Appointment> {
  const created = await apiClient.registerVisitWorkflow(payload)
  cache.clear("appointments")
  return created
}

export async function startVisitExamWorkflow(appointmentId: string): Promise<Appointment> {
  const updated = await apiClient.startVisitExamWorkflow(appointmentId)
  cache.clear("appointments")
  return updated
}

export async function finishVisitExamWorkflow(
  appointmentId: string,
  payload: {
    diagnosis: string
    symptoms: string
    treatment: string
    doctorId?: string
    doctorName?: string
    soap?: MedicalRecord["soap"]
    diagnosisCodes?: MedicalRecord["diagnosisCodes"]
    procedureCodes?: MedicalRecord["procedureCodes"]
    clinicalHistory?: MedicalRecord["clinicalHistory"]
    prescription?: MedicalRecord["prescription"]
    equipmentsUsed?: MedicalRecord["equipmentsUsed"]
    vitalSigns?: MedicalRecord["vitalSigns"]
    clinicalDecision?: MedicalRecord["clinicalDecision"]
    referralDestination?: string
    observationNotes?: string
    notes?: string
  },
): Promise<{ appointmentId: string; medicalRecord: MedicalRecord }> {
  const result = await apiClient.finishVisitExamWorkflow(appointmentId, payload)
  cache.clear("appointments")
  cache.clear("medicalRecords")
  cache.clear("pharmacyRequests")
  cache.clear("labOrders")
  cache.clear("billingRecords")
  cache.clear("auditLogs")
  return result
}

export async function finalizeMedicalRecordWorkflow(medicalRecordId: string, reason?: string): Promise<MedicalRecord> {
  const record = await apiClient.finalizeMedicalRecordWorkflow(medicalRecordId, reason)
  cache.clear("medicalRecords")
  cache.clear("auditLogs")
  return record
}

export async function updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
  const updated = await apiClient.updateAppointment(id, appointment)
  cache.clear("appointments")
  return updated
}

export async function deleteAppointment(id: string): Promise<void> {
  await apiClient.deleteAppointment(id)
  cache.clear("appointments")
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  const today = getLocalDateKey()
  const appointments = await getAppointments()
  return appointments.filter((a) => normalizeDateKey(a.date) === today)
}

export async function getNextQueueNumber(date: string): Promise<number> {
  const appointments = await getAppointments()
  const dayAppointments = appointments.filter((a) => normalizeDateKey(a.date) === date)
  if (dayAppointments.length === 0) return 1
  return Math.max(...dayAppointments.map((a) => a.queueNumber)) + 1
}

export async function getPatientAppointments(patientId: string): Promise<Appointment[]> {
  const appointments = await getAppointments()
  return appointments
    .filter((appointment) => appointment.patientId === patientId)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
}

// Medical Record functions
export async function getMedicalRecords(): Promise<MedicalRecord[]> {
  const cached = cache.get<MedicalRecord[]>("medicalRecords")
  if (cached) return cached
  
  const data = await apiClient.getMedicalRecords()
  cache.set("medicalRecords", data)
  return data
}

export async function getMedicalRecord(id: string): Promise<MedicalRecord> {
  return apiClient.getMedicalRecord(id)
}

export async function createMedicalRecord(record: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">): Promise<MedicalRecord> {
  const newRecord = await apiClient.createMedicalRecord(record)
  cache.clear("medicalRecords")
  cache.clear("pharmacyRequests")
  cache.clear("labOrders")
  cache.clear("billingRecords")
  cache.clear("auditLogs")
  return newRecord
}

export async function updateMedicalRecord(id: string, record: Partial<MedicalRecord>): Promise<MedicalRecord> {
  const updated = await apiClient.updateMedicalRecord(id, record)
  cache.clear("medicalRecords")
  cache.clear("pharmacyRequests")
  cache.clear("labOrders")
  cache.clear("billingRecords")
  cache.clear("auditLogs")
  return updated
}

export async function deleteMedicalRecord(id: string): Promise<void> {
  await apiClient.deleteMedicalRecord(id)
  cache.clear("medicalRecords")
  cache.clear("pharmacyRequests")
  cache.clear("labOrders")
  cache.clear("billingRecords")
  cache.clear("auditLogs")
}

export async function getPatientMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
  const records = await getMedicalRecords()
  return records.filter((r) => r.patientId === patientId)
}

export async function getLabResults(): Promise<LabResult[]> {
  const cached = cache.get<LabResult[]>("labResults")
  if (cached) return cached
  
  const data = await apiClient.getLabResults()
  cache.set("labResults", data)
  return data
}

export async function getLabResult(id: string): Promise<LabResult> {
  return apiClient.getLabResult(id)
}

export async function createLabResult(result: Omit<LabResult, "id" | "createdAt" | "updatedAt">): Promise<LabResult> {
  const newResult = await apiClient.createLabResult(result)
  cache.clear("labResults")
  return newResult
}

export async function updateLabResult(id: string, result: Partial<LabResult>): Promise<LabResult> {
  const updated = await apiClient.updateLabResult(id, result)
  cache.clear("labResults")
  return updated
}

export async function deleteLabResult(id: string): Promise<void> {
  await apiClient.deleteLabResult(id)
  cache.clear("labResults")
}

export async function getPatientLabResults(patientId: string): Promise<LabResult[]> {
  const results = await getLabResults()
  return results.filter((result) => result.patientId === patientId)
}

export async function getDocuments(category?: DocumentCategory): Promise<DocumentUpload[]> {
  return apiClient.getDocuments(category)
}

export async function uploadDocument(payload: {
  title: string
  category: DocumentCategory
  description?: string
  file: File
  uploader?: string
  patientId?: string
  medicalRecordId?: string
  labOrderId?: string
  insuranceClaimId?: string
}): Promise<DocumentUpload> {
  const formData = new FormData()
  formData.append("title", payload.title)
  formData.append("category", payload.category)
  if (payload.description) {
    formData.append("description", payload.description)
  }
  if (payload.uploader) {
    formData.append("uploader", payload.uploader)
  }
  if (payload.patientId) {
    formData.append("patientId", payload.patientId)
  }
  if (payload.medicalRecordId) {
    formData.append("medicalRecordId", payload.medicalRecordId)
  }
  if (payload.labOrderId) {
    formData.append("labOrderId", payload.labOrderId)
  }
  if (payload.insuranceClaimId) {
    formData.append("insuranceClaimId", payload.insuranceClaimId)
  }
  formData.append("file", payload.file)
  return apiClient.uploadDocument(formData)
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.deleteDocument(id)
}

export async function getPayments(): Promise<PaymentRecord[]> {
  const cached = cache.get<PaymentRecord[]>("payments")
  if (cached) return cached
  
  const data = await apiClient.getPayments()
  cache.set("payments", data)
  return data
}

export async function getPayment(id: string): Promise<PaymentRecord> {
  return apiClient.getPayment(id)
}

export async function createPayment(payment: Omit<PaymentRecord, "id" | "createdAt">): Promise<PaymentRecord> {
  const newPayment = await apiClient.createPaymentWorkflow(payment)
  cache.clear("payments")
  cache.clear("billingRecords")
  return newPayment
}

export async function updatePayment(id: string, payment: Partial<PaymentRecord>): Promise<PaymentRecord> {
  const updated = await apiClient.updatePayment(id, payment)
  cache.clear("payments")
  cache.clear("billingRecords")
  return updated
}

export async function deletePayment(id: string): Promise<void> {
  await apiClient.deletePayment(id)
  cache.clear("payments")
  cache.clear("billingRecords")
}

export async function addPayment(payment: Omit<PaymentRecord, "id" | "createdAt">): Promise<PaymentRecord> {
  return createPayment(payment)
}

export async function getPaymentSummaries(): Promise<PaymentSummary[]> {
  const [records, appointments, services, medicines] = await Promise.all([
    getMedicalRecords(),
    getAppointments(),
    getServices(),
    getMedicines(),
  ])

  return records.map((record) => {
    const appointment = appointments.find((item) => item.id === record.appointmentId)
    const appointmentServiceIds =
      appointment?.serviceIds?.length && appointment.serviceIds.length > 0
        ? appointment.serviceIds
        : appointment?.serviceId
          ? [appointment.serviceId]
          : []
    const resolvedServices = appointmentServiceIds
      .map((id) => services.find((service) => service.id === id))
      .filter((service): service is Service => Boolean(service))
    const serviceCost = resolvedServices.reduce((sum, service) => sum + service.price, 0)
    const medicineCost = (record.prescription ?? []).reduce((sum, prescription) => {
      const medicine = medicines.find((item) => item.id === prescription.medicineId)
      return sum + (medicine?.price ?? 0) * prescription.quantity
    }, 0)
    const serviceNames =
      resolvedServices.length > 0
        ? resolvedServices.map((service) => service.name)
        : appointment?.serviceName
          ? [appointment.serviceName]
          : ["Layanan Klinik"]
    const category =
      resolvedServices.length > 0
        ? Array.from(new Set(resolvedServices.map((service) => service.category))).join(", ")
        : "Layanan"

    return {
      id: record.id,
      patientId: record.patientId,
      patientName: appointment?.patientName ?? "Pasien",
      serviceName: serviceNames.join(", "),
      serviceDetails: serviceNames.join(", "),
      category,
      date: record.date,
      visitDate: record.date,
      treatment: record.treatment,
      medicines: (record.prescription ?? []).map((prescription) => prescription.medicineName),
      serviceCost,
      medicineCost,
      total: serviceCost + medicineCost,
      totalAmount: serviceCost + medicineCost,
    }
  })
}

// Utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatTime(timeString: string): string {
  return timeString
}

export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Medicine functions
export async function getMedicines(): Promise<Medicine[]> {
  const cached = cache.get<Medicine[]>("medicines")
  if (cached) return cached
  
  try {
    const data = await apiClient.getMedicines()
    cache.set("medicines", data)
    return data
  } catch (error) {
    if (isForbiddenApiError(error)) {
      return []
    }
    throw error
  }
}

export async function getMedicine(id: string): Promise<Medicine> {
  return apiClient.getMedicine(id)
}

export async function getStockMovements(limit = 100): Promise<StockMovement[]> {
  const cached = cache.get<StockMovement[]>("stockMovements")
  if (cached) return cached.slice(0, limit)
  const data = await apiClient.getStockMovements(limit)
  cache.set("stockMovements", data)
  return data
}

export async function getMedicineBatches(medicineId?: string): Promise<MedicineBatch[]> {
  return apiClient.getMedicineBatches(medicineId)
}

export async function receiveMedicineBatch(
  medicineId: string,
  payload: ReceiveBatchPayload,
): Promise<MedicineBatch> {
  const batch = await apiClient.receiveMedicineBatch(medicineId, payload)
  cache.clear("medicines")
  cache.clear("stockMovements")
  cache.clear("auditLogs")
  return batch
}

export async function adjustMedicineStock(id: string, payload: StockAdjustmentPayload): Promise<Medicine> {
  const updated = await apiClient.adjustMedicineStock(id, payload)
  cache.clear("medicines")
  cache.clear("stockMovements")
  cache.clear("auditLogs")
  return updated
}

export async function createMedicine(medicine: Omit<Medicine, "id" | "createdAt" | "updatedAt">): Promise<Medicine> {
  const newMedicine = await apiClient.createMedicine(medicine)
  cache.clear("medicines")
  cache.clear("stockMovements")
  return newMedicine
}

export async function updateMedicine(id: string, medicine: Partial<Medicine>): Promise<Medicine> {
  const updated = await apiClient.updateMedicine(id, medicine)
  cache.clear("medicines")
  cache.clear("stockMovements")
  return updated
}

export async function deleteMedicine(id: string): Promise<void> {
  await apiClient.deleteMedicine(id)
  cache.clear("medicines")
  cache.clear("stockMovements")
}

export async function generateMedicineCode(): Promise<string> {
  const medicines = await getMedicines()
  const count = (medicines.length + 1).toString().padStart(3, "0")
  return `OBT${count}`
}

export function updateMedicineStatus(medicine: Pick<Medicine, "stock" | "minStock">): Medicine["status"] {
  const stock = medicine.stock ?? 0
  const minStock = medicine.minStock ?? 0
  if (stock === 0) return "Habis"
  if (stock <= minStock) return "Stok Rendah"
  return "Tersedia"
}

// Medical Equipment functions
export async function getMedicalEquipments(): Promise<MedicalEquipment[]> {
  const cached = cache.get<MedicalEquipment[]>("equipments")
  if (cached) return cached
  
  const data = await apiClient.getMedicalEquipments()
  cache.set("equipments", data)
  return data
}

export async function getMedicalEquipment(id: string): Promise<MedicalEquipment> {
  return apiClient.getMedicalEquipment(id)
}

export async function createMedicalEquipment(equipment: Omit<MedicalEquipment, "id" | "createdAt" | "updatedAt">): Promise<MedicalEquipment> {
  const newEquipment = await apiClient.createMedicalEquipment(equipment)
  cache.clear("equipments")
  return newEquipment
}

export async function updateMedicalEquipment(id: string, equipment: Partial<MedicalEquipment>): Promise<MedicalEquipment> {
  const updated = await apiClient.updateMedicalEquipment(id, equipment)
  cache.clear("equipments")
  return updated
}

export async function deleteMedicalEquipment(id: string): Promise<void> {
  await apiClient.deleteMedicalEquipment(id)
  cache.clear("equipments")
}

export async function generateEquipmentCode(): Promise<string> {
  const equipments = await getMedicalEquipments()
  const count = (equipments.length + 1).toString().padStart(3, "0")
  return `ALT${count}`
}

// Pharmacy functions
export async function getPharmacyRequests(): Promise<PharmacyRequest[]> {
  const cached = cache.get<PharmacyRequest[]>("pharmacyRequests")
  if (cached) return cached
  const data = await apiClient.getPharmacyRequests()
  cache.set("pharmacyRequests", data)
  return data
}

export async function getLabOrders(): Promise<LabOrder[]> {
  const cached = cache.get<LabOrder[]>("labOrders")
  if (cached) return cached
  const data = await apiClient.getLabOrders()
  cache.set("labOrders", data)
  return data
}

export async function createLabOrder(payload: Partial<LabOrder>): Promise<LabOrder> {
  const created = await apiClient.createLabOrder(payload)
  cache.clear("labOrders")
  return created
}

export async function updateLabOrder(id: string, payload: Partial<LabOrder>): Promise<LabOrder> {
  const updated = await apiClient.updateLabOrder(id, payload)
  cache.clear("labOrders")
  return updated
}

export async function getBillingRecords(): Promise<BillingRecord[]> {
  const cached = cache.get<BillingRecord[]>("billingRecords")
  if (cached) return cached
  const data = await apiClient.getBillingRecords()
  cache.set("billingRecords", data)
  return data
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const cached = cache.get<AuditLog[]>("auditLogs")
  if (cached) return cached
  const data = await apiClient.getAuditLogs()
  cache.set("auditLogs", data)
  return data
}

export async function updatePharmacyRequest(id: string, payload: Partial<PharmacyRequest>): Promise<PharmacyRequest> {
  const updated = await apiClient.updatePharmacyRequest(id, payload)
  cache.clear("pharmacyRequests")
  cache.clear("medicines")
  cache.clear("stockMovements")
  cache.clear("auditLogs")
  return updated
}

export async function fulfillPharmacyRequest(id: string): Promise<PharmacyRequest> {
  const updated = await apiClient.dispensePharmacyRequestWorkflow(id)
  cache.clear("pharmacyRequests")
  cache.clear("medicines")
  cache.clear("stockMovements")
  cache.clear("auditLogs")
  cache.clear("billingRecords")
  return updated
}

export async function processPharmacyRequestWorkflow(id: string, notes?: string): Promise<PharmacyRequest> {
  const updated = await apiClient.processPharmacyRequestWorkflow(id, notes)
  cache.clear("pharmacyRequests")
  cache.clear("auditLogs")
  return updated
}

export async function createPharmacyRequestWorkflow(medicalRecordId: string): Promise<PharmacyRequest> {
  const created = await apiClient.createPharmacyRequestWorkflow(medicalRecordId)
  cache.clear("pharmacyRequests")
  cache.clear("billingRecords")
  cache.clear("auditLogs")
  return created
}

export async function verifyPharmacyRequestWorkflow(id: string, notes?: string): Promise<PharmacyRequest> {
  const updated = await apiClient.verifyPharmacyRequestWorkflow(id, notes)
  cache.clear("pharmacyRequests")
  cache.clear("auditLogs")
  return updated
}

export async function returnPharmacyRequest(id: string): Promise<PharmacyRequest> {
  const updated = await apiClient.cancelPharmacyRequestWorkflow(id, "Retur obat ditandai dari modul farmasi.")
  cache.clear("pharmacyRequests")
  cache.clear("medicines")
  cache.clear("stockMovements")
  cache.clear("auditLogs")
  cache.clear("billingRecords")
  return updated
}

export async function deletePharmacyRequest(id: string): Promise<void> {
  await apiClient.deletePharmacyRequest(id)
  cache.clear("pharmacyRequests")
}

// Report helpers
export async function getMorbidityReport(): Promise<MorbidityEntry[]> {
  return apiClient.getReportsMorbidity()
}

export async function getVisitReport(): Promise<VisitCounts> {
  return apiClient.getReportsVisits()
}

export async function getFinancialReport(): Promise<FinancialSummary> {
  return apiClient.getReportsFinancials()
}

export async function getProfitLossReport(filters?: { from?: string; to?: string }): Promise<ProfitLossReport> {
  return apiClient.getProfitLossReport(filters)
}

// Insurance helpers
export async function getInsuranceProfiles(): Promise<InsuranceProfile[]> {
  const cached = cache.get<InsuranceProfile[]>("insuranceProfiles")
  if (cached) return cached
  const data = await apiClient.getInsuranceProfiles()
  cache.set("insuranceProfiles", data)
  return data
}

export async function saveInsuranceProfile(profile: Partial<InsuranceProfile>): Promise<InsuranceProfile> {
  const payload = profile.id ? await apiClient.updateInsuranceProfile(profile.id, profile) : await apiClient.createInsuranceProfile(profile)
  cache.clear("insuranceProfiles")
  return payload
}

export async function deleteInsuranceProfile(id: string): Promise<void> {
  await apiClient.deleteInsuranceProfile(id)
  cache.clear("insuranceProfiles")
}

export async function getInsuranceBridgeMembers(): Promise<InsuranceBridgeMember[]> {
  const cached = cache.get<InsuranceBridgeMember[]>("insuranceBridgeMembers")
  if (cached) return cached
  const data = await apiClient.getInsuranceBridgeMembers()
  cache.set("insuranceBridgeMembers", data)
  return data
}

export async function verifyBpjsMember(participantNumber: string) {
  return apiClient.verifyBpjs(participantNumber)
}

// Klaim asuransi
export async function getInsuranceClaims(): Promise<InsuranceClaim[]> {
  const cached = cache.get<InsuranceClaim[]>("insuranceClaims")
  if (cached) return cached
  try {
    const data = await apiClient.getInsuranceClaims()
    cache.set("insuranceClaims", data)
    return data
  } catch (error) {
    // Role tanpa akses klaim (mis. dokter/bidan) tetap bisa membuka halaman ini.
    if (isForbiddenApiError(error)) {
      return []
    }
    throw error
  }
}

export async function createInsuranceClaim(payload: {
  billingRecordId: string
  provider?: InsuranceClaim["provider"]
  policyNumber?: string
  claimedAmount?: number
  notes?: string
}): Promise<InsuranceClaim> {
  const created = await apiClient.createInsuranceClaim(payload)
  cache.clear("insuranceClaims")
  cache.clear("billingRecords")
  return created
}

export async function updateInsuranceClaimStatus(
  id: string,
  status: Exclude<InsuranceClaimStatus, "draft">,
  payload: { approvedAmount?: number; rejectionReason?: string } = {},
): Promise<InsuranceClaim> {
  const updated = await apiClient.updateInsuranceClaimStatus(id, status, payload)
  cache.clear("insuranceClaims")
  cache.clear("billingRecords")
  cache.clear("payments")
  return updated
}

export async function deleteInsuranceClaim(id: string): Promise<void> {
  await apiClient.deleteInsuranceClaim(id)
  cache.clear("insuranceClaims")
  cache.clear("billingRecords")
}

// Master kode ICD-10/ICD-9-CM helpers
export async function getMedicalCodes(): Promise<MedicalCode[]> {
  const cached = cache.get<MedicalCode[]>("medicalCodes")
  if (cached) return cached
  const data = await apiClient.getMedicalCodes()
  cache.set("medicalCodes", data)
  return data
}

export async function saveMedicalCode(code: Partial<MedicalCode>): Promise<MedicalCode> {
  const payload = code.id
    ? await apiClient.updateMedicalCode(code.id, code)
    : await apiClient.createMedicalCode(code as Omit<MedicalCode, "id" | "createdAt" | "updatedAt">)
  cache.clear("medicalCodes")
  return payload
}

export async function deleteMedicalCode(id: string): Promise<void> {
  await apiClient.deleteMedicalCode(id)
  cache.clear("medicalCodes")
}

// ── Pengadaan: Supplier & Purchase Order ─────────────────────────────────────
export async function getSuppliers(): Promise<Supplier[]> {
  const cached = cache.get<Supplier[]>("suppliers")
  if (cached) return cached
  const data = await apiClient.getSuppliers()
  cache.set("suppliers", data)
  return data
}

export async function saveSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const payload = supplier.id
    ? await apiClient.updateSupplier(supplier.id, supplier)
    : await apiClient.createSupplier(supplier as Omit<Supplier, "id" | "createdAt" | "updatedAt">)
  cache.clear("suppliers")
  return payload
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiClient.deleteSupplier(id)
  cache.clear("suppliers")
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const cached = cache.get<PurchaseOrder[]>("purchaseOrders")
  if (cached) return cached
  const data = await apiClient.getPurchaseOrders()
  cache.set("purchaseOrders", data)
  return data
}

export async function savePurchaseOrder(order: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const payload = order.id
    ? await apiClient.updatePurchaseOrder(order.id, order)
    : await apiClient.createPurchaseOrder(order as Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">)
  cache.clear("purchaseOrders")
  return payload
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await apiClient.deletePurchaseOrder(id)
  cache.clear("purchaseOrders")
}

export async function receivePurchaseOrder(id: string, items: ReceivePurchaseOrderLine[]): Promise<PurchaseOrder> {
  const payload = await apiClient.receivePurchaseOrder(id, items)
  cache.clear("purchaseOrders")
  cache.clear("medicines")
  return payload
}

// ── Kas: pengeluaran & tutup kasir ───────────────────────────────────────────
export async function getExpenses(): Promise<Expense[]> {
  const cached = cache.get<Expense[]>("expenses")
  if (cached) return cached
  const data = await apiClient.getExpenses()
  cache.set("expenses", data)
  return data
}

export async function saveExpense(expense: Partial<Expense>): Promise<Expense> {
  const payload = expense.id
    ? await apiClient.updateExpense(expense.id, expense)
    : await apiClient.createExpense(expense as Omit<Expense, "id" | "createdAt" | "updatedAt">)
  cache.clear("expenses")
  return payload
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.deleteExpense(id)
  cache.clear("expenses")
}

export async function getCashierClosings(): Promise<CashierClosing[]> {
  const cached = cache.get<CashierClosing[]>("cashierClosings")
  if (cached) return cached
  const data = await apiClient.getCashierClosings()
  cache.set("cashierClosings", data)
  return data
}

export async function closeCashier(payload: {
  closingDate: string
  cashierName: string
  openingBalance: number
  countedCashTotal: number
  notes?: string
}): Promise<CashierClosing> {
  const result = await apiClient.closeCashier(payload)
  cache.clear("cashierClosings")
  return result
}

// Informed Consent helpers (persetujuan tindakan)
export async function getInformedConsents(): Promise<InformedConsent[]> {
  const cached = cache.get<InformedConsent[]>("informedConsents")
  if (cached) return cached
  const data = await apiClient.getInformedConsents()
  cache.set("informedConsents", data)
  return data
}

export async function saveInformedConsent(consent: Partial<InformedConsent>): Promise<InformedConsent> {
  const payload = consent.id
    ? await apiClient.updateInformedConsent(consent.id, consent)
    : await apiClient.createInformedConsent(consent)
  cache.clear("informedConsents")
  return payload
}

export async function deleteInformedConsent(id: string): Promise<void> {
  await apiClient.deleteInformedConsent(id)
  cache.clear("informedConsents")
}

// Referral helpers
export async function getReferrals(): Promise<Referral[]> {
  const cached = cache.get<Referral[]>("referrals")
  if (cached) return cached
  const data = await apiClient.getReferrals()
  cache.set("referrals", data)
  return data
}

export async function getReferralsByPatient(patientId: string): Promise<Referral[]> {
  const referrals = await getReferrals()
  return referrals.filter((referral) => referral.patientId === patientId)
}

export async function saveReferral(referral: Partial<Referral>): Promise<Referral> {
  const payload = referral.id ? await apiClient.updateReferral(referral.id, referral) : await apiClient.createReferral(referral)
  cache.clear("referrals")
  return payload
}

export async function deleteReferral(id: string): Promise<void> {
  await apiClient.deleteReferral(id)
  cache.clear("referrals")
}

export async function sendReferral(id: string, notes?: string): Promise<Referral> {
  const updated = await apiClient.sendReferral(id, notes)
  cache.clear("referrals")
  return updated
}

export async function receiveReferral(id: string, notes?: string): Promise<Referral> {
  const updated = await apiClient.receiveReferral(id, notes)
  cache.clear("referrals")
  return updated
}

export async function followUpReferral(id: string, notes?: string): Promise<Referral> {
  const updated = await apiClient.followUpReferral(id, notes)
  cache.clear("referrals")
  return updated
}

export async function rejectReferral(id: string, notes?: string): Promise<Referral> {
  const updated = await apiClient.rejectReferral(id, notes)
  cache.clear("referrals")
  return updated
}

export async function completeReferral(id: string, notes?: string): Promise<Referral> {
  const updated = await apiClient.completeReferral(id, notes)
  cache.clear("referrals")
  return updated
}

// Radiology
export async function getRadiologyOrders(): Promise<RadiologyOrder[]> {
  const cached = cache.get<RadiologyOrder[]>("radiologyOrders")
  if (cached) return cached
  const data = await apiClient.getRadiologyOrders()
  cache.set("radiologyOrders", data)
  return data
}

export async function createRadiologyOrder(order: Partial<RadiologyOrder>): Promise<RadiologyOrder> {
  const created = await apiClient.createRadiologyOrder(order)
  cache.clear("radiologyOrders")
  cache.clear("auditLogs")
  return created
}

export async function updateRadiologyOrder(id: string, order: Partial<RadiologyOrder>): Promise<RadiologyOrder> {
  const updated = await apiClient.updateRadiologyOrder(id, order)
  cache.clear("radiologyOrders")
  cache.clear("auditLogs")
  return updated
}

export async function deleteRadiologyOrder(id: string): Promise<void> {
  await apiClient.deleteRadiologyOrder(id)
  cache.clear("radiologyOrders")
  cache.clear("auditLogs")
}

export async function getReferralFacilities(): Promise<ReferralFacility[]> {
  const cached = cache.get<ReferralFacility[]>("referralFacilities")
  if (cached) return cached
  const data = await apiClient.getReferralFacilities()
  cache.set("referralFacilities", data)
  return data
}

export async function saveReferralFacility(facility: Partial<ReferralFacility>): Promise<ReferralFacility> {
  const payload = facility.id
    ? await apiClient.updateReferralFacility(facility.id, facility)
    : await apiClient.createReferralFacility(facility)
  cache.clear("referralFacilities")
  return payload
}

export async function deleteReferralFacility(id: string): Promise<void> {
  await apiClient.deleteReferralFacility(id)
  cache.clear("referralFacilities")
}

export async function getReferralReport(filters?: { from?: string; to?: string; facilityId?: string }): Promise<ReferralStats> {
  return apiClient.getReportsReferrals(filters)
}

// Hospital helpers
export async function getBeds(): Promise<Bed[]> {
  const cached = cache.get<Bed[]>("beds")
  if (cached) return cached
  const data = await apiClient.getBeds()
  cache.set("beds", data)
  return data
}

export async function createBed(payload: Partial<Bed>): Promise<Bed> {
  const created = await apiClient.createBed(payload)
  cache.clear("beds")
  return created
}

export async function updateBed(id: string, payload: Partial<Bed>): Promise<Bed> {
  const updated = await apiClient.updateBed(id, payload)
  cache.clear("beds")
  return updated
}

export async function deleteBed(id: string): Promise<boolean> {
  const success = await apiClient.deleteBed(id)
  cache.clear("beds")
  return success
}

export async function getAdmissions(): Promise<InpatientAdmission[]> {
  const cached = cache.get<InpatientAdmission[]>("inpatientAdmissions")
  if (cached) return cached
  const data = await apiClient.getAdmissions()
  cache.set("inpatientAdmissions", data)
  return data
}

export async function createAdmission(admission: Partial<InpatientAdmission>): Promise<InpatientAdmission> {
  const created = await apiClient.createAdmission(admission)
  cache.clear("inpatientAdmissions")
  return created
}

export async function updateAdmission(id: string, payload: Partial<InpatientAdmission>): Promise<{ admission: InpatientAdmission; bed?: Bed | null } | null> {
  try {
    const result = await apiClient.updateAdmission(id, payload)
    cache.clear("inpatientAdmissions")
    cache.clear("beds")
    return result
  } catch (error) {
    console.error("Gagal memperbarui admission", error)
    return null
  }
}

export async function deleteAdmission(id: string): Promise<boolean> {
  const success = await apiClient.deleteAdmission(id)
  cache.clear("inpatientAdmissions")
  cache.clear("beds")
  return success
}

export async function dischargeAdmission(
  admissionId: string,
  disposition: "discharged" | "referred" | "deceased" = "discharged"
): Promise<{ admission: InpatientAdmission; bed?: Bed | null }> {
  const result = await apiClient.dischargeAdmission(admissionId, disposition)
  cache.clear("inpatientAdmissions")
  cache.clear("beds")
  return result
}

export async function getVisitNotes(): Promise<DoctorVisitNote[]> {
  const cached = cache.get<DoctorVisitNote[]>("doctorVisitNotes")
  if (cached) return cached
  const data = await apiClient.getVisitNotes()
  cache.set("doctorVisitNotes", data)
  return data
}

export async function createVisitNote(note: Partial<DoctorVisitNote>): Promise<DoctorVisitNote> {
  const created = await apiClient.createVisitNote(note)
  cache.clear("doctorVisitNotes")
  return created
}

export async function updateVisitNote(id: string, note: Partial<DoctorVisitNote>): Promise<DoctorVisitNote | null> {
  try {
    const updated = await apiClient.updateVisitNote(id, note)
    cache.clear("doctorVisitNotes")
    return updated
  } catch (error) {
    console.error("Gagal memperbarui catatan visit dokter", error)
    return null
  }
}

export async function deleteVisitNote(id: string): Promise<boolean> {
  await apiClient.deleteVisitNote(id)
  cache.clear("doctorVisitNotes")
  return true
}

// Communications & engagement
export async function getPatientNotifications(): Promise<PatientNotification[]> {
  const cached = cache.get<PatientNotification[]>("patientNotifications")
  if (cached) return cached
  const data = await apiClient.getPatientNotifications()
  cache.set("patientNotifications", data)
  return data
}

export async function schedulePatientNotification(notification: Partial<PatientNotification>): Promise<PatientNotification> {
  const created = await apiClient.createPatientNotification(notification)
  cache.clear("patientNotifications")
  return created
}

export async function markNotificationAsSent(id: string): Promise<PatientNotification> {
  const updated = await apiClient.sendPatientNotification(id)
  cache.clear("patientNotifications")
  return updated
}

export async function getSatisfactionSurveys(): Promise<SatisfactionSurvey[]> {
  const cached = cache.get<SatisfactionSurvey[]>("satisfactionSurveys")
  if (cached) return cached
  const data = await apiClient.getSatisfactionSurveys()
  cache.set("satisfactionSurveys", data)
  return data
}

export async function submitSatisfactionSurvey(survey: Partial<SatisfactionSurvey>): Promise<SatisfactionSurvey> {
  const created = await apiClient.createSatisfactionSurvey(survey)
  cache.clear("satisfactionSurveys")
  return created
}
