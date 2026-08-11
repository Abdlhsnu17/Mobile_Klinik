// API Client untuk komunikasi dengan backend
import { buildApiBaseUrl } from "./api-base";
import type {
    Appointment,
    AuditLog,
    Bed,
    BillingRecord,
    ClinicSetting,
    Doctor,
    DoctorVisitNote,
    DocumentCategory,
    DocumentUpload,
    InpatientAdmission,
    InsuranceBridgeMember,
    InsuranceClaim,
    InsuranceClaimStatus,
    InsuranceProfile,
    LabOrder,
    LabResult,
    CashierClosing,
    CashierDailySummary,
    Expense,
    MedicalCode,
    MedicalEquipment,
    MedicalRecord,
    OperationalAlertsResponse,
    ProfitLossReport,
    PurchaseOrder,
    ReceivePurchaseOrderLine,
    Supplier,
    InformedConsent,
    Medicine,
    MedicineBatch,
    Patient,
    PatientNotification,
    PaymentRecord,
    PharmacyRequest,
    RadiologyOrder,
    ReceiveBatchPayload,
    Referral,
    ReferralFacility,
    SatisfactionSurvey,
    Service,
    StockAdjustmentPayload,
    StockMovement,
} from "./auth-types";
import { clearLocalSessionForRequest, getAuthToken } from "./auth-utils";
import { getApiPayloadMessage, getApiRequestId, getFriendlyApiErrorMessage, logClientError } from "./client-error";

const API_BASE = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

type RequestBody = Record<string, unknown> | unknown[]
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | RequestBody | null
}

type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown>
  requestId?: string
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

export function isForbiddenApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.status === 403
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  if (!payload || typeof payload !== "object") return false
  return Object.prototype.hasOwnProperty.call(payload, "data")
}

function shouldSerializeBody(body: RequestOptions["body"]): body is RequestBody {
  if (body == null) return false
  if (typeof body === "string") return false
  if (body instanceof FormData) return false
  if (body instanceof URLSearchParams) return false
  if (body instanceof Blob) return false
  if (body instanceof ArrayBuffer) return false
  if (ArrayBuffer.isView(body)) return false
  return true
}

class ApiClient {
  private async request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const method = init.method ?? "GET"
    const requestStartedAt = Date.now()
    const token = getAuthToken()
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    }

    const body = shouldSerializeBody(init.body) ? JSON.stringify(init.body) : init.body

    let response: Response
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        body,
        credentials: "include",
      })
    } catch (error) {
      logClientError(error, { module: "api", action: "network request", method, path })
      throw new Error("Tidak dapat terhubung ke server backend. Periksa koneksi Anda lalu coba lagi.")
    }

    // Handle 204 No Content response
    if (response.status === 204) {
      return null as T
    }

    const contentType = response.headers.get("content-type") ?? ""
    const isJson = contentType.includes("application/json")
    let payload: unknown = null

    if (isJson) {
      try {
        payload = await response.json()
      } catch (error) {
        logClientError(error, {
          module: "api",
          action: "parse response",
          method,
          path,
          status: response.status,
        })
        throw new Error("Respons server tidak dapat dibaca. Coba lagi beberapa saat.")
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        const sessionCleared = clearLocalSessionForRequest(requestStartedAt)
        if (sessionCleared && typeof window !== "undefined") window.location.href = "/login"
      }
      const payloadMessage = getApiPayloadMessage(payload)

      const message = getFriendlyApiErrorMessage({
        method,
        path,
        status: response.status,
        payloadMessage,
        fallbackMessage: "Permintaan ditolak server.",
      })

      // Rejected 4xx requests are expected application outcomes and are handled
      // by their callers. Logging them with console.error makes Next.js display a
      // misleading development error overlay even when the rejection is handled.
      if (response.status >= 500) {
        logClientError(new Error(message), {
          module: "api",
          action: "backend response",
          method,
          path,
          status: response.status,
        })
      }
      throw new ApiClientError(message, response.status, method, path, getApiRequestId(payload))
    }

    if (isApiEnvelope<T>(payload)) {
      return payload.data
    }

    return payload as T
  }

  // Patients
  async getPatients(): Promise<Patient[]> {
    return this.request("/patients")
  }

  async getPatient(id: string): Promise<Patient> {
    return this.request(`/patients/${id}`)
  }

  async createPatient(patient: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<Patient> {
    return this.request("/patients", {
      method: "POST",
      body: patient,
    })
  }

  async updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
    return this.request(`/patients/${id}`, {
      method: "PUT",
      body: patient,
    })
  }

  async deletePatient(id: string): Promise<void> {
    return this.request(`/patients/${id}`, { method: "DELETE" })
  }

  // Doctors
  async getDoctors(): Promise<Doctor[]> {
    return this.request("/doctors")
  }

  async getDoctor(id: string): Promise<Doctor> {
    return this.request(`/doctors/${id}`)
  }

  async createDoctor(doctor: Omit<Doctor, "id" | "createdAt">): Promise<Doctor> {
    return this.request("/doctors", {
      method: "POST",
      body: doctor,
    })
  }

  async updateDoctor(id: string, doctor: Partial<Doctor>): Promise<Doctor> {
    return this.request(`/doctors/${id}`, {
      method: "PUT",
      body: doctor,
    })
  }

  async deleteDoctor(id: string): Promise<void> {
    return this.request(`/doctors/${id}`, { method: "DELETE" })
  }

  // Services
  async getServices(): Promise<Service[]> {
    return this.request("/services")
  }

  async getService(id: string): Promise<Service> {
    return this.request(`/services/${id}`)
  }

  async createService(service: Omit<Service, "id">): Promise<Service> {
    return this.request("/services", {
      method: "POST",
      body: service,
    })
  }

  async updateService(id: string, service: Partial<Service>): Promise<Service> {
    return this.request(`/services/${id}`, {
      method: "PUT",
      body: service,
    })
  }

  async deleteService(id: string): Promise<void> {
    return this.request(`/services/${id}`, { method: "DELETE" })
  }

  // Master kode ICD-10/ICD-9-CM
  async getMedicalCodes(): Promise<MedicalCode[]> {
    return this.request("/medical-codes")
  }

  async createMedicalCode(code: Omit<MedicalCode, "id" | "createdAt" | "updatedAt">): Promise<MedicalCode> {
    return this.request("/medical-codes", {
      method: "POST",
      body: code,
    })
  }

  async updateMedicalCode(id: string, code: Partial<MedicalCode>): Promise<MedicalCode> {
    return this.request(`/medical-codes/${id}`, {
      method: "PUT",
      body: code,
    })
  }

  async deleteMedicalCode(id: string): Promise<void> {
    return this.request(`/medical-codes/${id}`, { method: "DELETE" })
  }

  async getClinicSettings(): Promise<ClinicSetting[]> {
    return this.request("/clinic-settings")
  }

  async createClinicSetting(
    payload: Omit<ClinicSetting, "id" | "createdAt" | "updatedAt">,
  ): Promise<ClinicSetting> {
    return this.request("/clinic-settings", {
      method: "POST",
      body: payload,
    })
  }

  async updateClinicSetting(id: string, payload: Partial<ClinicSetting>): Promise<ClinicSetting> {
    return this.request(`/clinic-settings/${id}`, {
      method: "PUT",
      body: payload,
    })
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return this.request("/appointments")
  }

  async getAppointment(id: string): Promise<Appointment> {
    return this.request(`/appointments/${id}`)
  }

  async createAppointment(appointment: Omit<Appointment, "id" | "createdAt">): Promise<Appointment> {
    return this.request("/appointments", {
      method: "POST",
      body: appointment,
    })
  }

  async registerVisitWorkflow(payload: {
    patientId: string
    doctorId?: string
    date: string
    time: string
    serviceId?: string
    serviceIds?: string[]
    notes?: string
  }): Promise<Appointment> {
    return this.request("/workflows/visits/register", {
      method: "POST",
      body: payload,
    })
  }

  async startVisitExamWorkflow(appointmentId: string): Promise<Appointment> {
    return this.request(`/workflows/visits/${appointmentId}/start-exam`, {
      method: "POST",
    })
  }

  async finishVisitExamWorkflow(
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
    return this.request(`/workflows/visits/${appointmentId}/finish-exam`, {
      method: "POST",
      body: payload,
    })
  }

  async finalizeMedicalRecordWorkflow(medicalRecordId: string, reason?: string): Promise<MedicalRecord> {
    return this.request(`/workflows/medical-records/${medicalRecordId}/finalize`, {
      method: "POST",
      body: reason ? { reason } : {},
    })
  }

  async syncBillingWorkflow(medicalRecordId: string): Promise<BillingRecord> {
    return this.request(`/workflows/billing/sync/${medicalRecordId}`, {
      method: "POST",
    })
  }

  async createPaymentWorkflow(payment: {
    medicalRecordId: string
    patientId?: string
    amount: number
    method: PaymentRecord["method"]
    notes?: string
    paidAt?: string
  }): Promise<PaymentRecord> {
    return this.request("/workflows/payments", {
      method: "POST",
      body: payment,
    })
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    return this.request(`/appointments/${id}`, {
      method: "PUT",
      body: appointment,
    })
  }

  async deleteAppointment(id: string): Promise<void> {
    return this.request(`/appointments/${id}`, { method: "DELETE" })
  }

  // Medical Records
  async getMedicalRecords(): Promise<MedicalRecord[]> {
    return this.request("/medical-records")
  }

  async getMedicalRecord(id: string): Promise<MedicalRecord> {
    return this.request(`/medical-records/${id}`)
  }

  async createMedicalRecord(record: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">): Promise<MedicalRecord> {
    return this.request("/medical-records", {
      method: "POST",
      body: record,
    })
  }

  async updateMedicalRecord(id: string, record: Partial<MedicalRecord>): Promise<MedicalRecord> {
    return this.request(`/medical-records/${id}`, {
      method: "PUT",
      body: record,
    })
  }

  async deleteMedicalRecord(id: string): Promise<void> {
    return this.request(`/medical-records/${id}`, { method: "DELETE" })
  }

  // Lab Results
  async getLabOrders(): Promise<LabOrder[]> {
    return this.request("/lab-orders")
  }

  async createLabOrder(order: Partial<LabOrder>): Promise<LabOrder> {
    return this.request("/lab-orders", { method: "POST", body: order })
  }

  async updateLabOrder(id: string, order: Partial<LabOrder>): Promise<LabOrder> {
    return this.request(`/lab-orders/${id}`, {
      method: "PUT",
      body: order,
    })
  }

  async getLabResults(): Promise<LabResult[]> {
    return this.request("/lab-results")
  }

  async getLabResult(id: string): Promise<LabResult> {
    return this.request(`/lab-results/${id}`)
  }

  async getDocuments(category?: DocumentCategory): Promise<DocumentUpload[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : ""
    return this.request(`/documents${query}`)
  }

  async uploadDocument(formData: FormData): Promise<DocumentUpload> {
    const requestStartedAt = Date.now()
    const token = getAuthToken()
    let response: Response
    try {
      response = await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        credentials: "include",
      })
    } catch (error) {
      logClientError(error, { module: "api", action: "upload document", method: "POST", path: "/documents" })
      throw new Error("POST /documents gagal: tidak dapat terhubung ke server backend.")
    }

    const contentType = response.headers.get("content-type") ?? ""
    const isJson = contentType.includes("application/json")
    let payload: unknown = null

    if (isJson) {
      try {
        payload = await response.json()
      } catch (error) {
        logClientError(error, {
          module: "api",
          action: "parse upload response",
          method: "POST",
          path: "/documents",
          status: response.status,
        })
        throw new Error("POST /documents gagal: respons server tidak dapat dibaca sebagai JSON.")
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        const sessionCleared = clearLocalSessionForRequest(requestStartedAt)
        if (sessionCleared && typeof window !== "undefined") window.location.href = "/login"
      }
      const payloadMessage = getApiPayloadMessage(payload)
      const requestId = getApiRequestId(payload)
      const message = `POST /documents gagal (HTTP ${response.status})${requestId ? ` [Request ID: ${requestId}]` : ""}: ${payloadMessage ?? "Unggahan ditolak server."}`
      logClientError(new Error(message), {
        module: "api",
        action: "upload response",
        method: "POST",
        path: "/documents",
        status: response.status,
      })
      throw new Error(message)
    }

    return payload as DocumentUpload
  }

  async deleteDocument(id: string): Promise<void> {
    return this.request(`/documents/${id}`, { method: "DELETE" })
  }

  async createLabResult(result: Omit<LabResult, "id" | "createdAt" | "updatedAt">): Promise<LabResult> {
    return this.request("/lab-results", {
      method: "POST",
      body: result,
    })
  }

  async updateLabResult(id: string, result: Partial<LabResult>): Promise<LabResult> {
    return this.request(`/lab-results/${id}`, {
      method: "PUT",
      body: result,
    })
  }

  async deleteLabResult(id: string): Promise<void> {
    return this.request(`/lab-results/${id}`, { method: "DELETE" })
  }

  // Medicines
  async getMedicines(): Promise<Medicine[]> {
    return this.request("/medicines")
  }

  async getMedicine(id: string): Promise<Medicine> {
    return this.request(`/medicines/${id}`)
  }

  async getStockMovements(limit = 100): Promise<StockMovement[]> {
    return this.request(`/medicines/stock-movements?limit=${encodeURIComponent(String(limit))}`)
  }

  async adjustMedicineStock(id: string, payload: StockAdjustmentPayload): Promise<Medicine> {
    return this.request(`/medicines/${id}/stock-adjustment`, {
      method: "POST",
      body: payload,
    })
  }

  async getMedicineBatches(medicineId?: string): Promise<MedicineBatch[]> {
    const query = medicineId ? `?medicineId=${encodeURIComponent(medicineId)}` : ""
    return this.request(`/medicines/batches${query}`)
  }

  async receiveMedicineBatch(medicineId: string, payload: ReceiveBatchPayload): Promise<MedicineBatch> {
    return this.request(`/medicines/${medicineId}/batches`, {
      method: "POST",
      body: payload,
    })
  }

  async createMedicine(medicine: Omit<Medicine, "id" | "createdAt" | "updatedAt">): Promise<Medicine> {
    return this.request("/medicines", {
      method: "POST",
      body: medicine,
    })
  }

  async updateMedicine(id: string, medicine: Partial<Medicine>): Promise<Medicine> {
    return this.request(`/medicines/${id}`, {
      method: "PUT",
      body: medicine,
    })
  }

  async deleteMedicine(id: string): Promise<void> {
    return this.request(`/medicines/${id}`, { method: "DELETE" })
  }

  // Medical Equipments
  async getMedicalEquipments(): Promise<MedicalEquipment[]> {
    return this.request("/medical-equipments")
  }

  async getMedicalEquipment(id: string): Promise<MedicalEquipment> {
    return this.request(`/medical-equipments/${id}`)
  }

  async createMedicalEquipment(equipment: Omit<MedicalEquipment, "id" | "createdAt" | "updatedAt">): Promise<MedicalEquipment> {
    return this.request("/medical-equipments", {
      method: "POST",
      body: equipment,
    })
  }

  async updateMedicalEquipment(id: string, equipment: Partial<MedicalEquipment>): Promise<MedicalEquipment> {
    return this.request(`/medical-equipments/${id}`, {
      method: "PUT",
      body: equipment,
    })
  }

  async deleteMedicalEquipment(id: string): Promise<void> {
    return this.request(`/medical-equipments/${id}`, { method: "DELETE" })
  }

  // Payments
  async getPayments(): Promise<PaymentRecord[]> {
    return this.request("/payments")
  }

  async getBillingRecords(): Promise<BillingRecord[]> {
    return this.request("/billing-records")
  }

  async getPayment(id: string): Promise<PaymentRecord> {
    return this.request(`/payments/${id}`)
  }

  async createPayment(payment: Omit<PaymentRecord, "id" | "createdAt">): Promise<PaymentRecord> {
    return this.request("/payments", {
      method: "POST",
      body: payment,
    })
  }

  async updatePayment(id: string, payment: Partial<PaymentRecord>): Promise<PaymentRecord> {
    return this.request(`/payments/${id}`, {
      method: "PUT",
      body: payment,
    })
  }

  async deletePayment(id: string): Promise<void> {
    return this.request(`/payments/${id}`, { method: "DELETE" })
  }

  // Pharmacy requests
  async getPharmacyRequests(): Promise<PharmacyRequest[]> {
    return this.request("/pharmacy-requests")
  }

  async updatePharmacyRequest(id: string, payload: Partial<PharmacyRequest>): Promise<PharmacyRequest> {
    return this.request(`/pharmacy-requests/${id}`, {
      method: "PUT",
      body: payload,
    })
  }

  async createPharmacyRequestWorkflow(medicalRecordId: string): Promise<PharmacyRequest> {
    return this.request("/workflows/pharmacy/requests", {
      method: "POST",
      body: { medicalRecordId },
    })
  }

  async verifyPharmacyRequestWorkflow(id: string, notes?: string): Promise<PharmacyRequest> {
    return this.request(`/workflows/pharmacy/requests/${id}/verify`, {
      method: "POST",
      body: notes ? { notes } : {},
    })
  }

  async processPharmacyRequestWorkflow(id: string, notes?: string): Promise<PharmacyRequest> {
    return this.request(`/workflows/pharmacy/requests/${id}/process`, {
      method: "POST",
      body: notes ? { notes } : {},
    })
  }

  async dispensePharmacyRequestWorkflow(id: string, notes?: string): Promise<PharmacyRequest> {
    return this.request(`/workflows/pharmacy/requests/${id}/dispense`, {
      method: "POST",
      body: notes ? { notes } : {},
    })
  }

  async cancelPharmacyRequestWorkflow(id: string, notes?: string): Promise<PharmacyRequest> {
    return this.request(`/workflows/pharmacy/requests/${id}/cancel`, {
      method: "POST",
      body: notes ? { notes } : {},
    })
  }

  async deletePharmacyRequest(id: string): Promise<void> {
    return this.request(`/pharmacy-requests/${id}`, { method: "DELETE" })
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.request("/audit-logs")
  }

  // Reporting
  async getReportsMorbidity(): Promise<MorbidityEntry[]> {
    return this.request("/reports/morbiditas")
  }

  async getReportsVisits(): Promise<VisitCounts> {
    return this.request("/reports/kunjungan")
  }

  async getReportsFinancials(): Promise<FinancialSummary> {
    return this.request("/reports/keuangan")
  }

  async getReportsReferrals(filters?: { from?: string; to?: string; facilityId?: string }): Promise<ReferralStats> {
    const query = filters
      ? new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]).toString()
      : ""
    return this.request(`/reports/rujukan${query ? `?${query}` : ""}`)
  }

  // Pengadaan: Supplier
  async getSuppliers(): Promise<Supplier[]> {
    return this.request("/suppliers")
  }

  async createSupplier(supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> {
    return this.request("/suppliers", { method: "POST", body: supplier })
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
    return this.request(`/suppliers/${id}`, { method: "PUT", body: supplier })
  }

  async deleteSupplier(id: string): Promise<void> {
    return this.request(`/suppliers/${id}`, { method: "DELETE" })
  }

  // Pengadaan: Purchase Order
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return this.request("/purchase-orders")
  }

  async createPurchaseOrder(order: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">): Promise<PurchaseOrder> {
    return this.request("/purchase-orders", { method: "POST", body: order })
  }

  async updatePurchaseOrder(id: string, order: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return this.request(`/purchase-orders/${id}`, { method: "PUT", body: order })
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    return this.request(`/purchase-orders/${id}`, { method: "DELETE" })
  }

  async receivePurchaseOrder(id: string, items: ReceivePurchaseOrderLine[]): Promise<PurchaseOrder> {
    return this.request(`/purchase-orders/${id}/receive`, { method: "POST", body: { items } })
  }

  // Kas: pengeluaran
  async getExpenses(): Promise<Expense[]> {
    return this.request("/expenses")
  }

  async createExpense(expense: Omit<Expense, "id" | "createdAt" | "updatedAt">): Promise<Expense> {
    return this.request("/expenses", { method: "POST", body: expense })
  }

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    return this.request(`/expenses/${id}`, { method: "PUT", body: expense })
  }

  async deleteExpense(id: string): Promise<void> {
    return this.request(`/expenses/${id}`, { method: "DELETE" })
  }

  // Kas: tutup kasir
  async getCashierClosings(): Promise<CashierClosing[]> {
    return this.request("/cashier-closings")
  }

  async getCashierSummary(date: string): Promise<CashierDailySummary> {
    return this.request(`/cashier/summary?date=${encodeURIComponent(date)}`)
  }

  async closeCashier(payload: { closingDate: string; cashierName: string; openingBalance: number; countedCashTotal: number; notes?: string }): Promise<CashierClosing> {
    return this.request("/cashier/close", { method: "POST", body: payload })
  }

  // Laporan laba-rugi
  async getProfitLossReport(filters?: { from?: string; to?: string }): Promise<ProfitLossReport> {
    const entries = Object.entries(filters ?? {}).filter(([, value]) => Boolean(value)) as [string, string][]
    const query = entries.length ? `?${new URLSearchParams(entries).toString()}` : ""
    return this.request(`/reports/laba-rugi${query}`)
  }

  // Peringatan operasional
  async getOperationalAlerts(params?: { expiryDays?: number; maintenanceDays?: number }): Promise<OperationalAlertsResponse> {
    const entries = Object.entries(params ?? {}).filter(([, value]) => value !== undefined)
    const query = entries.length
      ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString()}`
      : ""
    return this.request(`/alerts${query}`)
  }

  // Insurance
  async getInsuranceProfiles(): Promise<InsuranceProfile[]> {
    return this.request("/insurance/profiles")
  }

  async createInsuranceProfile(profile: Partial<InsuranceProfile>): Promise<InsuranceProfile> {
    return this.request("/insurance/profiles", {
      method: "POST",
      body: profile,
    })
  }

  async updateInsuranceProfile(id: string, profile: Partial<InsuranceProfile>): Promise<InsuranceProfile> {
    return this.request(`/insurance/profiles/${id}`, {
      method: "PUT",
      body: profile,
    })
  }

  async deleteInsuranceProfile(id: string): Promise<void> {
    return this.request(`/insurance/profiles/${id}`, { method: "DELETE" })
  }

  async getInsuranceBridgeMembers(): Promise<InsuranceBridgeMember[]> {
    return this.request("/insurance/bridge/members")
  }

  async verifyBpjs(memberNumber: string): Promise<InsuranceVerificationResult> {
    return this.request("/insurance/bridge/bpjs", {
      method: "POST",
      body: { participantNumber: memberNumber },
    })
  }

  // Insurance claims
  async getInsuranceClaims(): Promise<InsuranceClaim[]> {
    return this.request("/insurance/claims")
  }

  async getInsuranceClaim(id: string): Promise<InsuranceClaim> {
    return this.request(`/insurance/claims/${id}`)
  }

  async createInsuranceClaim(payload: {
    billingRecordId: string
    provider?: InsuranceClaim["provider"]
    policyNumber?: string
    claimedAmount?: number
    notes?: string
  }): Promise<InsuranceClaim> {
    return this.request("/insurance/claims", { method: "POST", body: payload })
  }

  async updateInsuranceClaim(id: string, payload: Partial<Pick<InsuranceClaim, "claimedAmount" | "policyNumber" | "notes">>): Promise<InsuranceClaim> {
    return this.request(`/insurance/claims/${id}`, { method: "PUT", body: payload })
  }

  async updateInsuranceClaimStatus(
    id: string,
    status: Exclude<InsuranceClaimStatus, "draft">,
    payload: { approvedAmount?: number; rejectionReason?: string } = {},
  ): Promise<InsuranceClaim> {
    return this.request(`/insurance/claims/${id}/status`, {
      method: "POST",
      body: { status, ...payload },
    })
  }

  async deleteInsuranceClaim(id: string): Promise<void> {
    return this.request(`/insurance/claims/${id}`, { method: "DELETE" })
  }

  // Referrals
  async getReferrals(filters?: { patientId?: string; status?: string; direction?: string; facilityId?: string; from?: string; to?: string }): Promise<Referral[]> {
    const query = filters
      ? new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]).toString()
      : ""
    return this.request(`/referrals${query ? `?${query}` : ""}`)
  }

  async getReferral(id: string): Promise<Referral> {
    return this.request(`/referrals/${id}`)
  }

  async createReferral(referral: Partial<Referral>): Promise<Referral> {
    return this.request("/referrals", { method: "POST", body: referral })
  }

  async updateReferral(id: string, referral: Partial<Referral>): Promise<Referral> {
    return this.request(`/referrals/${id}`, { method: "PUT", body: referral })
  }

  async sendReferral(id: string, notes?: string): Promise<Referral> {
    return this.request(`/referrals/${id}/send`, { method: "POST", body: { notes } })
  }

  async receiveReferral(id: string, notes?: string): Promise<Referral> {
    return this.request(`/referrals/${id}/receive`, { method: "POST", body: { notes } })
  }

  async followUpReferral(id: string, notes?: string): Promise<Referral> {
    return this.request(`/referrals/${id}/follow-up`, { method: "POST", body: { notes } })
  }

  async rejectReferral(id: string, notes?: string): Promise<Referral> {
    return this.request(`/referrals/${id}/reject`, { method: "POST", body: { notes } })
  }

  async completeReferral(id: string, notes?: string): Promise<Referral> {
    return this.request(`/referrals/${id}/complete`, { method: "POST", body: { notes } })
  }

  async deleteReferral(id: string): Promise<void> {
    return this.request(`/referrals/${id}`, { method: "DELETE" })
  }

  async getReferralFacilities(): Promise<ReferralFacility[]> {
    return this.request("/referral-facilities")
  }

  async createReferralFacility(facility: Partial<ReferralFacility>): Promise<ReferralFacility> {
    return this.request("/referral-facilities", { method: "POST", body: facility })
  }

  async updateReferralFacility(id: string, facility: Partial<ReferralFacility>): Promise<ReferralFacility> {
    return this.request(`/referral-facilities/${id}`, { method: "PUT", body: facility })
  }

  async deleteReferralFacility(id: string): Promise<void> {
    return this.request(`/referral-facilities/${id}`, { method: "DELETE" })
  }

  // Backup & Restore (admin)
  async importBackup(snapshot: unknown): Promise<{ restored: Record<string, number> }> {
    return this.request("/backup/import", { method: "POST", body: snapshot as RequestBody })
  }

  async runBackup(): Promise<{ file: string; log: string }> {
    return this.request("/backup/run", { method: "POST", body: {} })
  }

  // Informed Consent (persetujuan tindakan)
  async getInformedConsents(): Promise<InformedConsent[]> {
    return this.request("/informed-consents")
  }

  async createInformedConsent(consent: Partial<InformedConsent>): Promise<InformedConsent> {
    return this.request("/informed-consents", { method: "POST", body: consent })
  }

  async updateInformedConsent(id: string, consent: Partial<InformedConsent>): Promise<InformedConsent> {
    return this.request(`/informed-consents/${id}`, { method: "PUT", body: consent })
  }

  async deleteInformedConsent(id: string): Promise<void> {
    return this.request(`/informed-consents/${id}`, { method: "DELETE" })
  }

  // Radiology
  async getRadiologyOrders(): Promise<RadiologyOrder[]> {
    return this.request("/radiology-orders")
  }

  async createRadiologyOrder(order: Partial<RadiologyOrder>): Promise<RadiologyOrder> {
    return this.request("/radiology-orders", { method: "POST", body: order })
  }

  async updateRadiologyOrder(id: string, order: Partial<RadiologyOrder>): Promise<RadiologyOrder> {
    return this.request(`/radiology-orders/${id}`, { method: "PUT", body: order })
  }

  async deleteRadiologyOrder(id: string): Promise<void> {
    return this.request(`/radiology-orders/${id}`, { method: "DELETE" })
  }

  // Hospital
  async getBeds(): Promise<Bed[]> {
    return this.request("/hospital/beds")
  }

  async createBed(payload: Partial<Bed>): Promise<Bed> {
    return this.request("/hospital/beds", {
      method: "POST",
      body: payload,
    })
  }

  async updateBed(id: string, payload: Partial<Bed>): Promise<Bed> {
    return this.request(`/hospital/beds/${id}`, {
      method: "PUT",
      body: payload,
    })
  }

  async deleteBed(id: string): Promise<boolean> {
    await this.request(`/hospital/beds/${id}`, {
      method: "DELETE",
    })
    return true
  }

  async getAdmissions(): Promise<InpatientAdmission[]> {
    return this.request("/hospital/admissions")
  }

  async createAdmission(admission: Partial<InpatientAdmission>): Promise<InpatientAdmission> {
    return this.request("/hospital/admissions", {
      method: "POST",
      body: admission,
    })
  }

  async updateAdmission(
    id: string,
    admission: Partial<InpatientAdmission>
  ): Promise<{ admission: InpatientAdmission; bed?: Bed | null }> {
    return this.request(`/hospital/admissions/${id}`, {
      method: "PUT",
      body: admission,
    })
  }

  async deleteAdmission(id: string): Promise<boolean> {
    await this.request(`/hospital/admissions/${id}`, {
      method: "DELETE",
    })
    return true
  }

  async dischargeAdmission(
    id: string,
    disposition: "discharged" | "referred" | "deceased" = "discharged"
  ): Promise<{ admission: InpatientAdmission; bed?: Bed | null }> {
    return this.request(`/hospital/admissions/${id}/discharge`, {
      method: "PUT",
      body: { disposition },
    })
  }

  async getVisitNotes(): Promise<DoctorVisitNote[]> {
    return this.request("/hospital/visits")
  }

  async createVisitNote(note: Partial<DoctorVisitNote>): Promise<DoctorVisitNote> {
    return this.request("/hospital/visits", {
      method: "POST",
      body: note,
    })
  }

  async updateVisitNote(id: string, note: Partial<DoctorVisitNote>): Promise<DoctorVisitNote> {
    return this.request(`/hospital/visits/${id}`, {
      method: "PUT",
      body: note,
    })
  }

  async deleteVisitNote(id: string): Promise<void> {
    return this.request(`/hospital/visits/${id}`, {
      method: "DELETE",
    })
  }

  // Communications
  async getPatientNotifications(): Promise<PatientNotification[]> {
    return this.request("/patient-notifications")
  }

  async createPatientNotification(notification: Partial<PatientNotification>): Promise<PatientNotification> {
    return this.request("/patient-notifications", {
      method: "POST",
      body: notification,
    })
  }

  async updatePatientNotification(id: string, payload: Partial<PatientNotification>): Promise<PatientNotification> {
    return this.request(`/patient-notifications/${id}`, {
      method: "PUT",
      body: payload,
    })
  }

  async sendPatientNotification(id: string): Promise<PatientNotification> {
    return this.request(`/patient-notifications/${id}/send`, { method: "POST" })
  }

  async getSatisfactionSurveys(): Promise<SatisfactionSurvey[]> {
    return this.request("/satisfaction-surveys")
  }

  async createSatisfactionSurvey(body: Partial<SatisfactionSurvey>): Promise<SatisfactionSurvey> {
    return this.request("/satisfaction-surveys", {
      method: "POST",
      body,
    })
  }
}

export const apiClient = new ApiClient()

export interface MorbidityEntry {
  diagnosis: string
  occurrences: number
}

export interface VisitCounts {
  daily: number
  monthly: number
  yearly: number
  monthlyTrend: { label: string; count: number }[]
}

export interface FinancialSummary {
  totalRevenue: number
  totalBilled?: number
  outstandingBalance?: number
  insuranceClaims?: number
  byBillingStatus?: { status: string; total: number }[]
  byDoctor: { doctorId: string; doctorName: string; revenue: number }[]
  byService: { serviceId: string; serviceName: string; revenue: number }[]
  byMethod: { method: string; revenue: number }[]
}

export interface ReferralStats {
  total: number
  byStatus: { status: string; total: number }[]
  byDirection: { direction: string; total: number }[]
  byFacility: { facilityName: string; total: number }[]
}

export interface InsuranceVerificationResult {
  success: boolean
  message?: string
  status?: string
  facility?: string
  planName?: string
  coverageLevel?: string
  lastClaimDate?: string
}
