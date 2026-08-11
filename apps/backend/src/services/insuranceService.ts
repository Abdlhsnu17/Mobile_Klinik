import type { InsuranceClaim, InsuranceClaimStatus, PaymentMethod } from "../types";
import type { InsuranceProfile } from "../types";
import { now } from "../utils";
import { createHttpError } from "../utils/httpError";
import { BillingService } from "./billingService";
import { CollectionService } from "./collectionService";

/** Transisi status klaim yang diizinkan (state machine). */
const CLAIM_TRANSITIONS: Record<InsuranceClaim["status"], InsuranceClaimStatus[]> = {
  draft: ["submitted"],
  submitted: ["verified", "rejected"],
  verified: ["approved", "rejected"],
  approved: ["paid", "rejected"],
  paid: [],
  rejected: [],
}

const TERMINAL_CLAIM_STATUSES: InsuranceClaimStatus[] = ["paid", "rejected"]

function insuranceMethodFor(provider: InsuranceClaim["provider"]): PaymentMethod {
  return provider === "bpjs" ? "bpjs" : "asuransi-swasta"
}

export class InsuranceService {
  static async listProfiles() {
    return CollectionService.list("insuranceProfiles")
  }

  static async createProfile(data: Partial<InsuranceProfile>) {
    const payload = {
      ...data,
      id: data.id,
      createdAt: data.createdAt ?? now(),
      updatedAt: now(),
    }
    const created = await CollectionService.createItem("insuranceProfiles", payload)
    await BillingService.syncByPatientId(created.patientId)
    return created
  }

  static async updateProfile(id: string, data: Partial<InsuranceProfile>) {
    const existing = await CollectionService.findById("insuranceProfiles", id)
    const updated = await CollectionService.updateItem("insuranceProfiles", id, {
      ...data,
      updatedAt: now(),
    })
    if (existing?.patientId) {
      await BillingService.syncByPatientId(existing.patientId)
    }
    if (updated?.patientId && updated.patientId !== existing?.patientId) {
      await BillingService.syncByPatientId(updated.patientId)
    }
    return updated
  }

  static async deleteProfile(id: string) {
    const existing = await CollectionService.findById("insuranceProfiles", id)
    const deleted = await CollectionService.deleteItem("insuranceProfiles", id)
    if (deleted && existing?.patientId) {
      await BillingService.syncByPatientId(existing.patientId)
    }
    return deleted
  }

  static async listBridgeMembers() {
    return CollectionService.list("insuranceBridgeMembers")
  }

  static async verifyBpjs(participantNumber: string) {
    const members = await this.listBridgeMembers()
    const member = members.find((entry) => entry.participantNumber === participantNumber)
    if (!member) {
      return {
        success: false,
        message: "Nomor peserta tidak terdaftar di sistem bridging",
      }
    }
    return {
      success: true,
      status: member.status,
      facility: member.facility,
      coverageLevel: member.coverageLevel,
      lastClaimDate: member.lastClaimDate,
    }
  }

  // ---------------------------------------------------------------------------
  // Klaim asuransi: siklus draft -> submitted -> verified -> approved -> paid
  // (atau -> rejected). Coverage tagihan mengikuti keputusan klaim.
  // ---------------------------------------------------------------------------

  static async listClaims() {
    return CollectionService.list("insuranceClaims")
  }

  static async getClaim(id: string) {
    return CollectionService.findById("insuranceClaims", id)
  }

  /** Membuat klaim untuk sebuah tagihan. claimedAmount default = insuranceCoverage
   *  tagihan (porsi yang ditanggung asuransi). */
  static async createClaim(data: Partial<InsuranceClaim> & { billingRecordId: string }) {
    if (!data.billingRecordId) {
      throw createHttpError(400, "Tagihan (billingRecordId) wajib dipilih.")
    }
    const billing = await CollectionService.findById("billingRecords", data.billingRecordId)
    if (!billing) {
      throw createHttpError(404, "Tagihan untuk klaim tidak ditemukan.")
    }

    const existingClaims = await this.listClaims()
    // Tagihan hanya boleh diklaim ulang jika klaim sebelumnya ditolak. Klaim yang
    // masih berjalan maupun yang sudah dicairkan ("paid") memblokir klaim baru
    // agar tidak terjadi pencairan ganda atas tagihan yang sama.
    const duplicate = existingClaims.find(
      (claim) => claim.billingRecordId === billing.id && claim.status !== "rejected",
    )
    if (duplicate) {
      throw createHttpError(409, duplicate.status === "paid"
        ? "Tagihan ini sudah memiliki klaim yang dicairkan."
        : "Sudah ada klaim aktif untuk tagihan ini.")
    }

    const profiles = await CollectionService.list("insuranceProfiles")
    const profile = profiles.find((item) => item.patientId === billing.patientId)
    const coverage = Number(billing.insuranceCoverage ?? 0)
    if (!Number.isFinite(coverage) || coverage <= 0) {
      throw createHttpError(422, "Tagihan ini tidak memiliki porsi asuransi untuk diklaim.")
    }
    const claimedAmount = Number(data.claimedAmount ?? coverage)
    if (!Number.isFinite(claimedAmount) || claimedAmount <= 0) {
      throw createHttpError(422, "Nominal klaim harus lebih dari nol.")
    }
    // Nominal klaim tidak boleh melebihi porsi asuransi tagihan.
    if (claimedAmount > coverage) {
      throw createHttpError(422, "Nominal klaim tidak boleh melebihi porsi asuransi tagihan.")
    }

    const created = await CollectionService.createItem("insuranceClaims", {
      billingRecordId: billing.id,
      medicalRecordId: billing.medicalRecordId,
      patientId: billing.patientId,
      patientName: billing.patientName ?? profile?.patientName ?? "",
      provider: data.provider ?? profile?.provider ?? "bpjs",
      policyNumber: data.policyNumber ?? profile?.policyNumber,
      claimedAmount,
      approvedAmount: 0,
      status: "draft",
      notes: data.notes,
      createdAt: now(),
      updatedAt: now(),
    })

    if (billing.medicalRecordId) {
      await BillingService.syncByRecordId(billing.medicalRecordId)
    }
    return created
  }

  static async updateClaim(id: string, data: Partial<InsuranceClaim>) {
    const existing = await CollectionService.findById("insuranceClaims", id)
    if (!existing) {
      throw createHttpError(404, "Klaim tidak ditemukan.")
    }
    if (TERMINAL_CLAIM_STATUSES.includes(existing.status)) {
      throw createHttpError(409, "Klaim yang sudah final tidak dapat diubah.")
    }
    // Hanya field administratif yang boleh diedit langsung; status lewat transisi.
    const updated = await CollectionService.updateItem("insuranceClaims", id, {
      claimedAmount: data.claimedAmount !== undefined ? Number(data.claimedAmount) : existing.claimedAmount,
      policyNumber: data.policyNumber ?? existing.policyNumber,
      notes: data.notes ?? existing.notes,
      updatedAt: now(),
    })
    return updated
  }

  /** Menjalankan transisi status klaim beserta efek sampingnya. */
  static async transitionClaim(
    id: string,
    nextStatus: InsuranceClaimStatus,
    payload: { approvedAmount?: number; rejectionReason?: string } = {},
  ) {
    const claim = await CollectionService.findById("insuranceClaims", id)
    if (!claim) {
      throw createHttpError(404, "Klaim tidak ditemukan.")
    }
    const allowed = CLAIM_TRANSITIONS[claim.status] ?? []
    if (!allowed.includes(nextStatus)) {
      throw createHttpError(409, `Transisi klaim dari "${claim.status}" ke "${nextStatus}" tidak diizinkan.`)
    }

    const patch: Partial<InsuranceClaim> = { status: nextStatus, updatedAt: now() }

    if (nextStatus === "submitted") {
      patch.submittedAt = now()
    } else if (nextStatus === "verified") {
      patch.verifiedAt = now()
    } else if (nextStatus === "approved") {
      const approvedAmount = Number(payload.approvedAmount ?? claim.claimedAmount)
      if (!Number.isFinite(approvedAmount) || approvedAmount < 0) {
        throw createHttpError(400, "Nominal disetujui tidak valid.")
      }
      if (approvedAmount > Number(claim.claimedAmount)) {
        throw createHttpError(422, "Nominal disetujui tidak boleh melebihi nominal klaim.")
      }
      patch.approvedAmount = approvedAmount
      patch.approvedAt = now()
    } else if (nextStatus === "rejected") {
      patch.rejectionReason = payload.rejectionReason
      patch.approvedAmount = 0
    }

    let updated = await CollectionService.updateItem("insuranceClaims", id, patch)

    if (nextStatus === "paid") {
      // Pencairan: catat dana masuk dari asuransi sebesar approvedAmount lalu
      // tautkan ke klaim. Billing otomatis tersinkron oleh disbursement.
      const approvedAmount = Number(updated?.approvedAmount ?? claim.approvedAmount ?? 0)
      if (approvedAmount <= 0) {
        throw createHttpError(422, "Klaim belum memiliki nominal disetujui untuk dicairkan.")
      }
      const disbursement = await BillingService.recordInsuranceDisbursement({
        medicalRecordId: claim.medicalRecordId,
        patientId: claim.patientId,
        amount: approvedAmount,
        method: insuranceMethodFor(claim.provider),
        insuranceClaimId: claim.id,
        notes: `Pencairan klaim asuransi ${claim.provider}`,
      })
      updated = await CollectionService.updateItem("insuranceClaims", id, {
        paidAt: now(),
        paymentId: disbursement.id,
        updatedAt: now(),
      })
    } else if (claim.medicalRecordId) {
      // rejected / approved dsb: sinkronkan billing agar coverage & status ikut.
      await BillingService.syncByRecordId(claim.medicalRecordId)
    }

    return updated
  }

  static async deleteClaim(id: string) {
    const existing = await CollectionService.findById("insuranceClaims", id)
    if (!existing) return false
    if (existing.status === "paid") {
      throw createHttpError(409, "Klaim yang sudah dicairkan tidak dapat dihapus.")
    }
    const deleted = await CollectionService.deleteItem("insuranceClaims", id)
    if (deleted && existing.medicalRecordId) {
      await BillingService.syncByRecordId(existing.medicalRecordId)
    }
    return deleted
  }
}
