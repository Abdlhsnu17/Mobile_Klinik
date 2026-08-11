import type { Bed, DoctorVisitNote, InpatientAdmission } from "../types";
import { now } from "../utils";
import { createHttpError } from "../utils/httpError";
import { BillingService } from "./billingService";
import { CollectionService } from "./collectionService";

export class HospitalService {
  static async listBeds() {
    return CollectionService.list("beds")
  }

  static async createBed(data: Partial<Bed>) {
    if (!data.bedNumber || !data.ward) {
      throw createHttpError(400, "Nomor bed dan ruangan (ward) wajib diisi.")
    }

    return CollectionService.createItem("beds", {
      ...data,
      status: data.status ?? "available",
      lastCleanedAt: data.lastCleanedAt ?? now(),
      assignedPatientId: data.assignedPatientId ?? null,
    })
  }

  static async updateBed(id: string, payload: Partial<Bed>) {
    return CollectionService.updateItem("beds", id, { ...payload, lastCleanedAt: payload.lastCleanedAt ?? now() })
  }

  static async deleteBed(id: string) {
    const bed = await CollectionService.findById("beds", id)
    if (!bed) return false

    if (bed.status === "occupied" || bed.assignedPatientId) {
      throw createHttpError(409, `Bed ${bed.bedNumber} sedang terisi dan tidak dapat dihapus.`)
    }

    return CollectionService.deleteItem("beds", id)
  }

  static async listAdmissions() {
    return CollectionService.list("inpatientAdmissions")
  }

  static async createAdmission(data: Partial<InpatientAdmission>) {
    if (!data.patientId) {
      throw createHttpError(400, "Informasi pasien wajib diisi untuk admisi.")
    }

    const admissionStatus = data.status ?? "pending"

    // 1. Validasi bed jika pasien langsung masuk rawat inap
    if (admissionStatus === "ongoing") {
      if (!data.bedId) {
        throw createHttpError(400, "Bed wajib dipilih jika pasien masuk rawat inap.")
      }

      const bed = await CollectionService.findById("beds", data.bedId)
      if (!bed) {
        throw createHttpError(404, `Bed dengan ID ${data.bedId} tidak ditemukan.`)
      }
      if (bed.status !== "available") {
        throw createHttpError(409, `Bed ${bed.bedNumber} tidak tersedia (status: ${bed.status}).`)
      }
    }

    // 2. Buat data admisi
    const newAdmission = await CollectionService.createItem("inpatientAdmissions", {
      ...data,
      status: admissionStatus,
      admittedAt: data.admittedAt ?? now(),
      updatedAt: now(),
    })

    // 3. Update status bed setelah admisi berhasil dibuat
    if (newAdmission.bedId && newAdmission.status === "ongoing") {
      await CollectionService.updateItem("beds", newAdmission.bedId, { status: "occupied", assignedPatientId: newAdmission.patientId })
    }

    await this.syncBillingForAdmission(newAdmission)

    return newAdmission
  }

  static async updateAdmission(admissionId: string, payload: Partial<InpatientAdmission>) {
    const admission = await CollectionService.findById("inpatientAdmissions", admissionId)
    if (!admission) return null

    const desiredBedId = payload.bedId ?? admission.bedId ?? ""
    if (desiredBedId && desiredBedId !== admission.bedId) {
      const targetBed = await CollectionService.findById("beds", desiredBedId)
      if (!targetBed) {
        throw createHttpError(404, "Tempat tidur tidak ditemukan")
      }
      if (targetBed.status !== "available") {
        throw createHttpError(409, "Tempat tidur tidak tersedia")
      }
    }

    if (admission.bedId && admission.bedId !== desiredBedId) {
      await CollectionService.updateItem("beds", admission.bedId, {
        status: "available",
        assignedPatientId: null,
      })
    }

    let updatedBed: Bed | null = null
    if (desiredBedId && desiredBedId !== admission.bedId) {
      updatedBed = await CollectionService.updateItem("beds", desiredBedId, {
        status: "occupied",
        assignedPatientId: admission.patientId,
      })
    }

    const updatedAdmission = await CollectionService.updateItem("inpatientAdmissions", admissionId, {
      ...payload,
      bedId: desiredBedId,
    })

    await this.syncBillingForAdmission(updatedAdmission)

    return { admission: updatedAdmission, bed: updatedBed }
  }

  static async dischargeAdmission(
    admissionId: string,
    disposition: "discharged" | "referred" | "deceased" = "discharged"
  ) {
    const admission = await CollectionService.findById("inpatientAdmissions", admissionId)
    if (!admission) return null

    const updatedAdmission = await CollectionService.updateItem("inpatientAdmissions", admissionId, {
      status: disposition,
      dischargeDisposition: disposition,
      dischargedAt: now(),
    })

    let updatedBed: Bed | null = null
    if (admission.bedId) {
      updatedBed = await CollectionService.updateItem("beds", admission.bedId, {
        status: "available",
        assignedPatientId: null,
      })
    }

    await this.syncBillingForAdmission(updatedAdmission)

    return { admission: updatedAdmission, bed: updatedBed }
  }

  static async deleteAdmission(admissionId: string) {
    const admission = await CollectionService.findById("inpatientAdmissions", admissionId)
    if (!admission) return false

    if (admission.bedId) {
      await CollectionService.updateItem("beds", admission.bedId, {
        status: "available",
        assignedPatientId: null,
      })
    }

    await this.syncBillingForAdmission(admission)

    return CollectionService.deleteItem("inpatientAdmissions", admissionId)
  }

  static async addVisitNote(payload: Partial<DoctorVisitNote>) {
    return CollectionService.createItem("doctorVisitNotes", {
      ...payload,
      date: payload.date ?? new Date().toISOString().split("T")[0],
      updatedAt: now(),
    })
  }

  static async updateVisitNote(noteId: string, payload: Partial<DoctorVisitNote>) {
    const note = await CollectionService.findById("doctorVisitNotes", noteId)
    if (!note) return null

    return CollectionService.updateItem("doctorVisitNotes", noteId, {
      ...payload,
    })
  }

  static async deleteVisitNote(noteId: string) {
    const note = await CollectionService.findById("doctorVisitNotes", noteId)
    if (!note) return false
    return CollectionService.deleteItem("doctorVisitNotes", noteId)
  }

  static async listVisitNotes(admissionId?: string) {
    const notes = await CollectionService.list("doctorVisitNotes")
    return admissionId ? notes.filter((note) => note.admissionId === admissionId) : notes
  }

  private static async syncBillingForAdmission(admission: InpatientAdmission | null | undefined) {
    if (!admission) return
    if (admission.medicalRecordId) {
      await BillingService.syncByRecordId(admission.medicalRecordId)
      return
    }
    await BillingService.syncByPatientId(admission.patientId)
  }
}
