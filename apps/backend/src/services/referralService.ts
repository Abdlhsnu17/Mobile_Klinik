import type { AuthTokenPayload } from "../middlewares/auth";
import type { MedicalRecord, Referral, ReferralStatus } from "../types";
import { now } from "../utils";
import { createHttpError } from "../utils/httpError";
import { AuditService } from "./auditService";
import { CollectionService } from "./collectionService";

const STATUS_TIMESTAMP_FIELD: Partial<Record<ReferralStatus, keyof Referral>> = {
  sent: "sentAt",
  received: "receivedAt",
  "followed-up": "followedUpAt",
  rejected: "rejectedAt",
  completed: "completedAt",
}

const ALLOWED_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  draft: ["sent"],
  sent: ["received", "rejected"],
  received: ["followed-up", "rejected"],
  "followed-up": ["completed"],
  rejected: [],
  completed: [],
}

export class ReferralService {
  static async list(filters?: { patientId?: string; status?: string; direction?: string; facilityId?: string; from?: string; to?: string }) {
    const referrals = await CollectionService.list("referrals")
    if (!filters) return referrals

    return referrals.filter((referral) => {
      if (filters.patientId && referral.patientId !== filters.patientId) return false
      if (filters.status && referral.status !== filters.status) return false
      if (filters.direction && referral.direction !== filters.direction) return false
      if (filters.facilityId && referral.facilityId !== filters.facilityId) return false
      if (filters.from && referral.createdAt < filters.from) return false
      if (filters.to && referral.createdAt > filters.to) return false
      return true
    })
  }

  static async getById(id: string) {
    const referral = await CollectionService.findById("referrals", id)
    if (!referral) throw createHttpError(404, "Rujukan tidak ditemukan.")
    return referral
  }

  static async createOutgoing(payload: Partial<Referral>, user?: AuthTokenPayload) {
    if (!payload.patientId || !payload.patientName) {
      throw createHttpError(400, "Data pasien wajib diisi.")
    }
    if (!payload.facilityName) {
      throw createHttpError(400, "Fasilitas tujuan wajib diisi.")
    }
    if (!payload.reason) {
      throw createHttpError(400, "Alasan rujukan wajib diisi.")
    }

    const created = await CollectionService.createItem("referrals", {
      ...payload,
      direction: "outgoing",
      status: payload.status ?? "draft",
      createdAt: now(),
      updatedAt: now(),
    })

    await AuditService.record({
      collection: "referrals",
      itemId: created.id,
      action: "create",
      user,
      after: created,
    })

    return created
  }

  static async createIncoming(payload: Partial<Referral>, user?: AuthTokenPayload) {
    if (!payload.patientId || !payload.patientName) {
      throw createHttpError(400, "Data pasien wajib diisi.")
    }
    if (!payload.facilityName) {
      throw createHttpError(400, "Fasilitas asal wajib diisi.")
    }
    if (!payload.reason) {
      throw createHttpError(400, "Alasan rujukan wajib diisi.")
    }

    const created = await CollectionService.createItem("referrals", {
      ...payload,
      direction: "incoming",
      status: payload.status ?? "received",
      receivedAt: payload.status === "received" || !payload.status ? now() : payload.receivedAt,
      createdAt: now(),
      updatedAt: now(),
    })

    await AuditService.record({
      collection: "referrals",
      itemId: created.id,
      action: "create",
      user,
      after: created,
    })

    return created
  }

  static async createFromMedicalRecord(record: MedicalRecord, doctor?: { id: string; name: string } | null, patient?: { id: string; name: string } | null) {
    if (record.clinicalDecision !== "referral") return null

    const existing = await this.list({ patientId: record.patientId })
    const alreadyLinked = existing.find((referral) => referral.medicalRecordId === record.id)
    if (alreadyLinked) return alreadyLinked

    const facilities = await CollectionService.list("referralFacilities")
    const matchedFacility = record.referralDestination
      ? facilities.find((facility) => facility.name.toLowerCase() === record.referralDestination?.toLowerCase())
      : undefined

    return CollectionService.createItem("referrals", {
      direction: "outgoing",
      patientId: record.patientId,
      patientName: patient?.name ?? "Pasien tidak dikenal",
      medicalRecordId: record.id,
      doctorId: doctor?.id ?? record.doctorId,
      doctorName: doctor?.name ?? record.doctorName,
      facilityId: matchedFacility?.id,
      facilityName: matchedFacility?.name ?? record.referralDestination ?? "Belum ditentukan",
      diagnosis: record.diagnosis,
      reason: record.diagnosis ?? "Rujukan dari hasil pemeriksaan",
      status: "draft",
      createdAt: now(),
      updatedAt: now(),
    })
  }

  static async update(id: string, payload: Partial<Referral>) {
    const existing = await this.getById(id)
    if (existing.status !== "draft") {
      throw createHttpError(409, "Rujukan yang sudah dikirim tidak dapat diedit.")
    }
    return CollectionService.updateItem("referrals", id, { ...payload, updatedAt: now() })
  }

  static async updateStatus(id: string, nextStatus: ReferralStatus, notes: string | undefined, user?: AuthTokenPayload) {
    const existing = await this.getById(id)
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? []
    if (!allowed.includes(nextStatus)) {
      throw createHttpError(409, `Status rujukan tidak dapat diubah dari "${existing.status}" ke "${nextStatus}".`)
    }

    const timestampField = STATUS_TIMESTAMP_FIELD[nextStatus]
    const payload: Partial<Referral> = {
      status: nextStatus,
      updatedAt: now(),
      ...(notes ? { notes } : {}),
      ...(timestampField ? { [timestampField]: now() } : {}),
    }

    const updated = await CollectionService.updateItem("referrals", id, payload)

    await AuditService.record({
      collection: "referrals",
      itemId: id,
      action: "status-change",
      user,
      before: existing,
      after: updated,
      reason: notes,
    })

    return updated
  }

  static async remove(id: string) {
    const existing = await this.getById(id)
    if (existing.status !== "draft") {
      throw createHttpError(409, "Hanya rujukan berstatus draf yang dapat dihapus.")
    }
    return CollectionService.deleteItem("referrals", id)
  }
}
