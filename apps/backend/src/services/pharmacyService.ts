import { medicineRepository } from "../modules/medicine/medicine.repository";
import { medicineService } from "../modules/medicine/medicine.service";
import type { MedicalRecord, PharmacyRequest } from "../types";
import { now } from "../utils";
import { createHttpError } from "../utils/httpError";
import { BillingService } from "./billingService";
import { CollectionService } from "./collectionService";

const DISPENSED_STATUSES: PharmacyRequest["status"][] = ["dispensed", "fulfilled"]
const TERMINAL_STATUSES: PharmacyRequest["status"][] = ["dispensed", "fulfilled", "cancelled"]

export class PharmacyService {
  static async list() {
    return CollectionService.list("pharmacyRequests")
  }

  static async getByRecord(recordId: string) {
    const requests = await this.list()
    return requests.find((request) => request.medicalRecordId === recordId) ?? null
  }

  static async createFromMedicalRecord(record: MedicalRecord) {
    if (!record.prescription || record.prescription.length === 0) return null

    const patient =
      (await CollectionService.findById("patients", record.patientId)) ??
      ({ name: "Pasien tidak dikenal" } as Record<string, unknown>)
    const doctor = await CollectionService.findById("doctors", record.doctorId)

    const existing = await this.getByRecord(record.id)
    if (existing) return existing

    const payload: Partial<PharmacyRequest> = {
      medicalRecordId: record.id,
      patientId: record.patientId,
      patientName: patient.name as string,
      doctorId: doctor?.id,
      doctorName: doctor?.name,
      items: record.prescription,
      status: "requested",
      requestedAt: now(),
      updatedAt: now(),
    }

    return CollectionService.createItem("pharmacyRequests", payload)
  }

  static async syncFromMedicalRecord(record: MedicalRecord) {
    const existingRequest = await this.getByRecord(record.id)
    const hasPrescription = record.prescription && record.prescription.length > 0

    if (existingRequest) {
      if (hasPrescription) {
        // Update resep pada permintaan yang sudah ada
        const payload: Partial<PharmacyRequest> = {
          items: record.prescription,
          updatedAt: now(),
        }
        return CollectionService.updateItem("pharmacyRequests", existingRequest.id, payload)
      }
      // Hapus permintaan jika resep dikosongkan
      return CollectionService.deleteItem("pharmacyRequests", existingRequest.id)
    }
    if (hasPrescription) {
      // Buat permintaan baru jika belum ada
      return this.createFromMedicalRecord(record)
    }
    return null
  }

  static async updateStatus(id: string, status: PharmacyRequest["status"], notes?: string) {
    const existing = await CollectionService.findById("pharmacyRequests", id)
    if (!existing) return null
    const isReturnFromDispensed = status === "cancelled" && DISPENSED_STATUSES.includes(existing.status)
    if (TERMINAL_STATUSES.includes(existing.status) && existing.status !== status && !isReturnFromDispensed) {
      throw createHttpError(409, "Status permintaan farmasi sudah final dan tidak dapat diubah.")
    }

    if (DISPENSED_STATUSES.includes(status) && !DISPENSED_STATUSES.includes(existing.status)) {
      await this.dispenseStock(existing)
    }
    if (isReturnFromDispensed) {
      await this.returnStock(existing)
    }

    const payload: Partial<PharmacyRequest> = {
      status,
      updatedAt: now(),
    }
    if (status === "verified" || status === "processing") payload.verificationNotes = notes
    if (status === "dispensed" || status === "fulfilled") {
      payload.dispensingNotes = notes
      payload.fulfilledAt = now()
    }
    const updated = await CollectionService.updateItem("pharmacyRequests", id, payload)
    await BillingService.syncByRecordId(existing.medicalRecordId)
    return updated
  }

  private static async dispenseStock(request: PharmacyRequest) {
    const items = request.items ?? request.prescription ?? []
    // Menggabungkan validasi dan update dalam satu loop untuk mengurangi race condition.
    // Meskipun tidak sepenuhnya transaksional tanpa database transaction,
    // ini lebih aman daripada memvalidasi semua lalu mengupdate semua.
    //
    // Pengurangan stok didelegasikan ke medicineService agar mengikuti FEFO:
    // batch yang paling cepat kedaluwarsa dihabiskan lebih dulu, dan batch yang
    // sudah lewat tanggal kedaluwarsa tidak pernah ikut terserahkan.
    for (const item of items) {
      const medicine = await medicineRepository.findById(item.medicineId);

      if (!medicine) {
        throw createHttpError(404, `Obat ${item.medicineName} tidak ditemukan.`)
      }

      await medicineService.consumeStockFefo({
        medicineId: item.medicineId,
        quantity: item.quantity,
        referenceId: request.id,
        notes: `Dispensed for patient: ${request.patientName}`,
      })
    }
  }

  private static async returnStock(request: PharmacyRequest) {
    const items = request.items ?? request.prescription ?? []

    // Alokasi batch saat penyerahan dibaca ulang dari kartu stok supaya obat
    // kembali ke batch asalnya, bukan menumpuk di batch yang kebetulan terbaru.
    const allocations = (await medicineRepository.findDispenseAllocations(request.id)) ?? []

    if (allocations.length > 0) {
      const byMedicine = new Map<string, { batchId: string | null; quantity: number }[]>()
      for (const allocation of allocations) {
        const entries = byMedicine.get(allocation.medicineId) ?? []
        entries.push({ batchId: allocation.batchId, quantity: allocation.quantity })
        byMedicine.set(allocation.medicineId, entries)
      }

      for (const [medicineId, entries] of byMedicine) {
        await medicineService.returnStockToBatches({
          medicineId,
          entries,
          referenceId: request.id,
          notes: `Returned from pharmacy request for patient: ${request.patientName}`,
        })
      }
      return
    }

    // Penyerahan lama yang belum punya jejak alokasi: kembalikan sesuai item resep.
    for (const item of items) {
      const medicine = await medicineRepository.findById(item.medicineId)

      if (!medicine) {
        throw createHttpError(404, `Obat ${item.medicineName} tidak ditemukan.`)
      }

      await medicineService.returnStockToBatches({
        medicineId: item.medicineId,
        entries: [{ batchId: null, quantity: item.quantity }],
        referenceId: request.id,
        notes: `Returned from pharmacy request for patient: ${request.patientName}`,
      })
    }
  }
}
