import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { subscribeToQueueChanges } from "@/lib/realtime";

/**
 * Custom Hook untuk load data dari API dengan error handling
 * Menggantikan pola sync get* functions dengan async loading
 * 
 * Usage:
 * const { data, loading, error } = useClinicData("patients")
 * 
 * Supported collections:
 * - "patients"
 * - "users"
 * - "doctors"
 * - "services"
 * - "appointments"
 * - "appointments/today"
 * - "medical-records"
 * - "medicines"
 * - "medical-equipments"
 * - "lab-results"
 * - "payments"
 */

import { getPatients } from "@/lib/api/patients";
import type {
    Appointment,
    AuditLog,
    Bed,
    BillingRecord,
    CashierClosing,
    Doctor,
    DoctorVisitNote,
    DocumentCategory,
    DocumentUpload,
    Expense,
    InformedConsent,
    InpatientAdmission,
    InsuranceBridgeMember,
    InsuranceClaim,
    InsuranceProfile,
    LabOrder,
    LabResult,
    MedicalCode,
    MedicalEquipment,
    MedicalRecord,
    Medicine,
    Patient,
    PatientNotification,
    PaymentRecord,
    PaymentSummary,
    PharmacyRequest,
    PurchaseOrder,
    RadiologyOrder,
    Referral,
    ReferralFacility,
    SatisfactionSurvey,
    Service,
    Supplier,
    User,
} from "@/lib/auth-types";
import { fetchUsers } from "@/lib/auth-utils";
import {
    getAdmissions,
    getAppointments,
    getAuditLogs,
    getBeds,
    getBillingRecords,
    getCashierClosings,
    getDoctors,
    getDocuments,
    getExpenses,
    getInformedConsents,
    getInsuranceBridgeMembers,
    getInsuranceClaims,
    getInsuranceProfiles,
    getLabOrders,
    getLabResults,
    getMedicalCodes,
    getMedicalEquipments,
    getMedicalRecords,
    getMedicines,
    getPatientNotifications,
    getPayments,
    getPaymentSummaries,
    getPharmacyRequests,
    getRadiologyOrders,
    getPurchaseOrders,
    getReferralFacilities,
    getReferrals,
    getSatisfactionSurveys,
    getServices,
    getSuppliers,
    getTodayAppointments,
    getVisitNotes,
} from "@/lib/clinic-utils";

type CollectionType = 
  | "patients"
  | "users"
  | "doctors"
  | "services"
  | "medical-codes"
  | "appointments"
  | "appointments/today"
  | "medical-records"
  | "medicines"
  | "medical-equipments"
  | "lab-orders"
  | "lab-results"
  | "radiology-orders"
  | "informed-consents"
  | "payments"
  | "billing-records"
  | "payment-summaries"
  | "documents"
  | `documents?category=${DocumentCategory}`
  | "pharmacy-requests"
  | "insurance-profiles"
  | "insurance-bridge-members"
  | "insurance-claims"
  | "beds"
  | "inpatient-admissions"
  | "doctor-visit-notes"
  | "patient-notifications"
  | "satisfaction-surveys"
  | "audit-logs"
  | "referrals"
  | "referral-facilities"
  | "suppliers"
  | "purchase-orders"
  | "expenses"
  | "cashier-closings"

type DataType =
  | Patient
  | User
  | Doctor
  | Service
  | Appointment
  | MedicalRecord
  | Medicine
  | MedicalCode
  | MedicalEquipment
  | LabOrder
  | LabResult
  | RadiologyOrder
  | InformedConsent
  | PaymentRecord
  | BillingRecord
  | PaymentSummary
  | DocumentUpload
  | PharmacyRequest
  | InsuranceProfile
  | InsuranceBridgeMember
  | InsuranceClaim
  | Bed
  | InpatientAdmission
  | DoctorVisitNote
  | PatientNotification
  | SatisfactionSurvey
  | AuditLog
  | Referral
  | ReferralFacility
  | Supplier
  | PurchaseOrder
  | Expense
  | CashierClosing

interface UseClinicDataResult<T> {
  data: T[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

type UseClinicDataOptions = {
  enabled?: boolean
}

export function useClinicData<T extends DataType>(
  collection: CollectionType,
  refreshKey?: unknown,
  options: UseClinicDataOptions = {}
): UseClinicDataResult<T> {
  const [data, setData] = useState<T[]>([])
  const enabled = options.enabled ?? true
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)

  const getFetcher = useCallback((): (() => Promise<T[]>) => {
    if (collection.startsWith("documents?category=")) {
      const category = collection.split("=").at(1) as DocumentCategory | undefined;
      return (() => getDocuments(category) as Promise<T[]>)
    }
    if (collection === "documents") {
      const category =
        typeof refreshKey === "string" && refreshKey !== "semua-kategori"
          ? (refreshKey as DocumentCategory)
          : undefined
      return (() => getDocuments(category) as Promise<T[]>)
    }

    const fetchers: Record<Exclude<CollectionType, `documents?category=${DocumentCategory}`>, () => Promise<T[]>> = {
      patients: getPatients as () => Promise<T[]>,
      users: fetchUsers as any,
      doctors: getDoctors as () => Promise<T[]>,
      services: getServices as () => Promise<T[]>,
      "medical-codes": getMedicalCodes as () => Promise<T[]>,
      appointments: getAppointments as () => Promise<T[]>,
      "appointments/today": getTodayAppointments as () => Promise<T[]>,
      "medical-records": getMedicalRecords as () => Promise<T[]>,
      medicines: getMedicines as () => Promise<T[]>,
      "medical-equipments": getMedicalEquipments as () => Promise<T[]>,
      "lab-orders": getLabOrders as () => Promise<T[]>,
      "lab-results": getLabResults as () => Promise<T[]>,
      "radiology-orders": getRadiologyOrders as () => Promise<T[]>,
      "informed-consents": getInformedConsents as () => Promise<T[]>,
      payments: getPayments as () => Promise<T[]>,
      "billing-records": getBillingRecords as () => Promise<T[]>,
      "payment-summaries": getPaymentSummaries as () => Promise<T[]>,
      documents: getDocuments as () => Promise<T[]>,
      "pharmacy-requests": getPharmacyRequests as () => Promise<T[]>,
      "insurance-profiles": getInsuranceProfiles as () => Promise<T[]>,
      "insurance-bridge-members": getInsuranceBridgeMembers as () => Promise<T[]>,
      "insurance-claims": getInsuranceClaims as () => Promise<T[]>,
      beds: getBeds as () => Promise<T[]>,
      "inpatient-admissions": getAdmissions as () => Promise<T[]>,
      "doctor-visit-notes": getVisitNotes as () => Promise<T[]>,
      "patient-notifications": getPatientNotifications as () => Promise<T[]>,
      "satisfaction-surveys": getSatisfactionSurveys as () => Promise<T[]>,
      "audit-logs": getAuditLogs as () => Promise<T[]>,
      referrals: getReferrals as () => Promise<T[]>,
      "referral-facilities": getReferralFacilities as () => Promise<T[]>,
      suppliers: getSuppliers as () => Promise<T[]>,
      "purchase-orders": getPurchaseOrders as () => Promise<T[]>,
      expenses: getExpenses as () => Promise<T[]>,
      "cashier-closings": getCashierClosings as () => Promise<T[]>,
    }

    const fetcher = fetchers[collection as Exclude<CollectionType, `documents?category=${DocumentCategory}`>]
    if (!fetcher) {
      throw new Error(`Unknown collection: ${collection}`)
    }
    return fetcher
  }, [collection, refreshKey])

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setData([])
      setError(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await getFetcher()()
      setData(result)
    } catch (err) {
      console.error(`Gagal memuat data ${collection}:`, err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [enabled, getFetcher])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!enabled || (collection !== "appointments" && collection !== "appointments/today")) return
    return subscribeToQueueChanges(() => {
      void fetchData()
    })
  }, [collection, enabled, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

export function DataLoading({ message = "Memuat data..." }: { message?: string }) {
  return (
    <div className="flex min-h-60 items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  )
}

export function DataError({
  error: _error,
  onRetry,
}: {
  error: Error
  onRetry?: () => void | Promise<void>
}) {
  return (
    <div className="mx-auto flex min-h-60 w-full max-w-xl items-center justify-center">
      <Alert variant="destructive">
        <AlertDescription>
          <div className="flex w-full flex-col gap-3">
            <p>Data belum dapat dimuat. Muat ulang halaman atau coba beberapa saat lagi.</p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void onRetry()}>
                <RefreshCw className="h-4 w-4" />
                Coba lagi
              </Button>
            ) : null}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
