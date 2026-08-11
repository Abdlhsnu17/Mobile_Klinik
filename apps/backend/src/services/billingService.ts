import type { BillingRecord, InsuranceClaim, MedicalRecord, PaymentRecord, PharmacyRequest } from "../types";
import { now } from "../utils";
import { createHttpError } from "../utils/httpError";
import { CollectionService } from "./collectionService";

const DEFAULT_INPATIENT_DAILY_RATE = 250000
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Klaim yang sudah punya keputusan final dari asuransi (bukan lagi menunggu proses). */
const SETTLED_CLAIM_STATUSES: InsuranceClaim["status"][] = ["paid", "rejected"]

function isInsurancePayment(payment: Pick<PaymentRecord, "paymentSource">): boolean {
  return payment.paymentSource === "insurance"
}

function calculateBillingStatus(
  total: number,
  patientPaid: number,
  options: { hasInsurance: boolean; claimPending: boolean },
): BillingRecord["status"] {
  if (total <= 0) return "calculated"
  if (patientPaid >= total) return "paid"
  if (patientPaid > 0) return "partially_paid"
  // Selama klaim asuransi belum ada keputusan final, tagihan pasien belum ditagihkan.
  return options.hasInsurance && options.claimPending ? "claimed_to_insurance" : "waiting_payment"
}

function calculateAdmissionDays(admittedAt?: string, dischargedAt?: string) {
  if (!admittedAt) return 0
  const start = new Date(admittedAt).getTime()
  const end = dischargedAt ? new Date(dischargedAt).getTime() : Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1
  return Math.max(1, Math.ceil((end - start) / MS_PER_DAY))
}

export class BillingService {
  static async getByRecord(medicalRecordId: string) {
    const billings = await CollectionService.list("billingRecords")
    return billings.find((billing) => billing.medicalRecordId === medicalRecordId) ?? null
  }

  static async syncAll() {
    const records = await CollectionService.list("medicalRecords")
    const synced = []
    for (const record of records) {
      const billing = await this.syncFromMedicalRecord(record)
      if (billing) synced.push(billing)
    }
    return synced
  }

  static async syncFromMedicalRecord(record: MedicalRecord) {
    const [patients, appointments, services, medicines, payments, pharmacyRequests, insuranceProfiles, admissions, equipments, insuranceClaims] = await Promise.all([
      CollectionService.list("patients"),
      CollectionService.list("appointments"),
      CollectionService.list("services"),
      CollectionService.list("medicines"),
      CollectionService.list("payments"),
      CollectionService.list("pharmacyRequests"),
      CollectionService.list("insuranceProfiles"),
      CollectionService.list("inpatientAdmissions"),
      CollectionService.list("medicalEquipments"),
      CollectionService.list("insuranceClaims"),
    ])

    const patient = patients.find((item) => item.id === record.patientId)
    const appointment = appointments.find((item) => item.id === record.appointmentId)
    const serviceIds = appointment?.serviceIds?.length
      ? appointment.serviceIds
      : appointment?.serviceId
        ? [appointment.serviceId]
        : []
    // Kolom DECIMAL MySQL (price, sellPrice, amount, dst.) dikembalikan driver
    // sebagai string agar presisi tidak hilang. Operator "+" pada string
    // melakukan penggabungan teks, bukan penjumlahan, jadi setiap nilai harga
    // harus dibungkus Number(...) sebelum dijumlahkan (lihat insiden total
    // tagihan yang meledak jadi puluhan miliar akibat concatenation ini).
    const serviceCost = serviceIds.reduce((sum, serviceId) => {
      const service = services.find((item) => item.id === serviceId)
      if (!service || service.category === "Laboratorium") return sum
      return sum + Number(service.price ?? 0)
    }, 0)

    const labCost = serviceIds.reduce((sum, serviceId) => {
      const service = services.find((item) => item.id === serviceId)
      if (service?.category !== "Laboratorium") return sum
      return sum + Number(service.price ?? 0)
    }, 0)

    const pharmacyRequest = (pharmacyRequests as PharmacyRequest[]).find((request) => request.medicalRecordId === record.id)
    const dispensedItems = pharmacyRequest && ["dispensed", "fulfilled"].includes(pharmacyRequest.status)
      ? pharmacyRequest.items ?? pharmacyRequest.prescription ?? []
      : []
    const medicineSource = dispensedItems.length > 0 ? dispensedItems : record.prescription ?? []
    const medicineCost = medicineSource.reduce((sum, prescription) => {
      const medicine = medicines.find((item) => item.id === prescription.medicineId)
      return sum + (Number(medicine?.sellPrice ?? medicine?.price ?? 0) * Number(prescription.quantity ?? 0))
    }, 0)

    const equipmentCost = (record.equipmentsUsed ?? []).reduce((sum, usage) => {
      const equipment = equipments.find((item) => item.id === usage.equipmentId)
      const unitCost = Number((equipment as any)?.usageCost ?? (equipment as any)?.price ?? 0)
      return sum + (Number.isFinite(unitCost) ? unitCost : 0)
    }, 0)

    const linkedAdmissions = admissions.filter((admission) =>
      admission.medicalRecordId
        ? admission.medicalRecordId === record.id
        : admission.patientId === record.patientId && record.clinicalDecision === "inpatient-required",
    )
    const inpatientCost = linkedAdmissions.reduce((sum, admission) => {
      const dailyRate = Number((admission as any).dailyRate ?? (admission as any).roomRate ?? DEFAULT_INPATIENT_DAILY_RATE)
      const days = calculateAdmissionDays(admission.admittedAt, admission.dischargedAt)
      return sum + (Number.isFinite(dailyRate) ? dailyRate : DEFAULT_INPATIENT_DAILY_RATE) * days
    }, 0)

    const recordPayments = payments.filter((payment) => payment.medicalRecordId === record.id)
    // Dana pasien dan dana asuransi dipisah: pembayaran asuransi tidak boleh
    // dihitung menutup porsi tanggungan pasien (dan tidak masuk kas kasir).
    const paidAmount = recordPayments
      .filter((payment) => !isInsurancePayment(payment))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const insurancePaidAmount = recordPayments
      .filter((payment) => isInsurancePayment(payment))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

    const insurance = insuranceProfiles.find((item) => item.patientId === record.patientId)
    const grossTotal = serviceCost + medicineCost + labCost + inpatientCost + equipmentCost

    // Porsi teoretis dari rateMultiplier profil asuransi (dipakai selama klaim
    // belum ada keputusan final).
    // rateMultiplier di-clamp ke [0,1] agar nilai di luar rentang (mis. negatif)
    // tidak menghasilkan coverage > 100% atau porsi negatif secara diam-diam.
    const parsedMultiplier = Number(insurance?.rateMultiplier)
    const rateMultiplier = Number.isFinite(parsedMultiplier) ? Math.max(0, Math.min(parsedMultiplier, 1)) : 1
    const theoreticalCoverage = insurance
      ? Math.max(0, grossTotal * (1 - rateMultiplier))
      : 0

    // Klaim final menentukan coverage sebenarnya: "paid" -> approvedAmount,
    // "rejected" -> 0 (seluruh sisa jatuh ke pasien). Inilah penanganan selisih
    // klaim ditolak / kurang bayar (Fase 4).
    // Satu rekam medis bisa memiliki beberapa klaim (mis. klaim ditolak lalu
    // diklaim ulang). Coverage ditentukan klaim TERBARU sebagai keputusan yang
    // berlaku, bukan sekadar klaim pertama yang ditemukan.
    const claim = insuranceClaims
      .filter((item) => item.medicalRecordId === record.id)
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]
    const claimSettled = claim ? SETTLED_CLAIM_STATUSES.includes(claim.status) : false
    let insuranceCoverage = theoreticalCoverage
    if (claim?.status === "paid") {
      insuranceCoverage = Number(claim.approvedAmount ?? 0)
    } else if (claim?.status === "rejected") {
      insuranceCoverage = 0
    }
    insuranceCoverage = Math.max(0, Math.min(insuranceCoverage, grossTotal))
    const total = Math.max(0, grossTotal - insuranceCoverage)

    const payload: Partial<BillingRecord> = {
      medicalRecordId: record.id,
      patientId: record.patientId,
      patientName: patient?.name ?? "Pasien tidak dikenal",
      serviceCost,
      medicineCost,
      labCost,
      inpatientCost,
      equipmentCost,
      adminCost: 0,
      discount: 0,
      insuranceCoverage,
      total,
      paidAmount,
      insurancePaidAmount,
      status: calculateBillingStatus(total, paidAmount, {
        hasInsurance: Boolean(insurance) || Boolean(claim),
        claimPending: !claimSettled,
      }),
      updatedAt: now(),
    }

    const existing = await this.getByRecord(record.id)
    if (existing) {
      return CollectionService.updateItem("billingRecords", existing.id, payload)
    }

    return CollectionService.createItem("billingRecords", {
      ...payload,
      createdAt: now(),
    })
  }

  static async syncByRecordId(medicalRecordId: string) {
    const record = await CollectionService.findById("medicalRecords", medicalRecordId)
    if (!record) return null
    return this.syncFromMedicalRecord(record)
  }

  static async syncByPatientId(patientId: string) {
    const records = await CollectionService.list("medicalRecords")
    const synced = []
    for (const record of records.filter((item) => item.patientId === patientId)) {
      const billing = await this.syncFromMedicalRecord(record)
      if (billing) synced.push(billing)
    }
    return synced
  }

  static async recordPayment(payload: Partial<PaymentRecord>) {
    const amount = Number(payload.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw createHttpError(400, "Jumlah pembayaran harus lebih dari nol.")
    }
    if (!payload.medicalRecordId) {
      throw createHttpError(400, "Rekam medis wajib dipilih.")
    }

    const record = await CollectionService.findById("medicalRecords", payload.medicalRecordId)
    if (!record) {
      throw createHttpError(404, "Rekam medis untuk pembayaran tidak ditemukan.")
    }
    if (payload.patientId && payload.patientId !== record.patientId) {
      throw createHttpError(409, "Pasien pembayaran tidak sesuai dengan rekam medis.")
    }

    const billing = await this.syncFromMedicalRecord(record)
    if (!billing) {
      throw createHttpError(422, "Tagihan belum dapat dibuat untuk rekam medis ini.")
    }

    const paymentSource = payload.paymentSource === "insurance" ? "insurance" : "patient"
    // Pembayaran pasien dibatasi sisa tanggungan pasien; pembayaran asuransi
    // dibatasi sisa coverage yang belum dicairkan.
    const remainingAmount = paymentSource === "insurance"
      ? Math.max(0, billing.insuranceCoverage - billing.insurancePaidAmount)
      : Math.max(0, billing.total - billing.paidAmount)
    if (remainingAmount <= 0) {
      throw createHttpError(409, paymentSource === "insurance" ? "Coverage asuransi sudah cair penuh." : "Tagihan sudah lunas.")
    }

    const payment = await CollectionService.createItem("payments", {
      ...payload,
      patientId: record.patientId,
      medicalRecordId: record.id,
      paymentSource,
      amount: Math.min(amount, remainingAmount),
      paidAt: payload.paidAt ?? now(),
    })
    await this.syncByRecordId(record.id)
    return payment
  }

  /** Mencatat pencairan dana dari asuransi untuk sebuah rekam medis. Berbeda dari
   *  recordPayment: nominal tidak dibatasi sisa tanggungan pasien, tapi tetap
   *  ditandai paymentSource "insurance" agar tidak dihitung sebagai kas kasir. */
  static async recordInsuranceDisbursement(payload: {
    medicalRecordId: string
    patientId: string
    amount: number
    method: PaymentRecord["method"]
    insuranceClaimId?: string
    notes?: string
    paidAt?: string
  }) {
    const amount = Number(payload.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw createHttpError(400, "Nominal pencairan asuransi harus lebih dari nol.")
    }
    const payment = await CollectionService.createItem("payments", {
      medicalRecordId: payload.medicalRecordId,
      patientId: payload.patientId,
      amount,
      method: payload.method,
      paymentSource: "insurance",
      insuranceClaimId: payload.insuranceClaimId,
      notes: payload.notes,
      paidAt: payload.paidAt ?? now(),
    })
    await this.syncByRecordId(payload.medicalRecordId)
    return payment
  }

  static async updatePayment(id: string, payload: Partial<PaymentRecord>) {
    const existing = await CollectionService.findById("payments", id)
    if (!existing) return null

    const nextPayment = { ...existing, ...payload }
    const amount = Number(nextPayment.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw createHttpError(400, "Jumlah pembayaran harus lebih dari nol.")
    }

    const record = await CollectionService.findById("medicalRecords", nextPayment.medicalRecordId)
    if (!record) {
      throw createHttpError(404, "Rekam medis untuk pembayaran tidak ditemukan.")
    }
    if (nextPayment.patientId !== record.patientId) {
      throw createHttpError(409, "Pasien pembayaran tidak sesuai dengan rekam medis.")
    }

    const billing = await this.syncFromMedicalRecord(record)
    if (!billing) {
      throw createHttpError(422, "Tagihan belum dapat dibuat untuk rekam medis ini.")
    }

    const paidWithoutCurrentPayment =
      billing.medicalRecordId === existing.medicalRecordId
        ? Math.max(0, billing.paidAmount - existing.amount)
        : billing.paidAmount
    const remainingAmount = Math.max(0, billing.total - paidWithoutCurrentPayment)
    if (remainingAmount <= 0) {
      throw createHttpError(409, "Tagihan sudah lunas.")
    }

    const updated = await CollectionService.updateItem("payments", id, {
      ...payload,
      patientId: record.patientId,
      medicalRecordId: record.id,
      amount: Math.min(amount, remainingAmount),
    })

    if (existing.medicalRecordId !== record.id) {
      await this.syncByRecordId(existing.medicalRecordId)
    }
    await this.syncByRecordId(record.id)
    return updated
  }
}
