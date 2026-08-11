import type { LabResult } from "../types";
import { now } from "../utils";
import { CollectionService } from "./collectionService";

function appendLabReviewNote(notes: string | undefined, orderId: string, reviewedAt: string, doctorName?: string) {
  const reviewer = doctorName ?? "dokter"
  const reviewNote = `Hasil lab untuk order ${orderId} telah direview oleh ${reviewer} pada ${reviewedAt}.`
  if (!notes) return reviewNote
  if (notes.includes(reviewNote)) return notes
  return `${notes}\n${reviewNote}`
}

export class LabResultService {
  static async syncFromResult(result: LabResult) {
    if (!result.labOrderId) return null
    return this.syncFromOrderId(result.labOrderId)
  }

  static async syncFromOrderId(labOrderId: string) {
    if (!labOrderId) return null

    const order = await CollectionService.findById("labOrders", labOrderId)
    if (!order) return null

    const results = await CollectionService.list("labResults")
    const linkedResults = results.filter((item) => item.labOrderId === labOrderId)

    if (linkedResults.length === 0) {
      const updatePayload = order.status === "reviewed"
        ? {
            status: "completed" as const,
            reviewedAt: undefined,
            reviewedByDoctorId: undefined,
            reviewedByDoctorName: undefined,
            updatedAt: now(),
          }
        : {
            updatedAt: now(),
          }
      return CollectionService.updateItem("labOrders", labOrderId, updatePayload)
    }

    const reviewedAt = now()
    const reviewedByDoctorId = order.doctorId
    const reviewedByDoctorName = order.doctorName

    if (order.medicalRecordId) {
      const medicalRecord = await CollectionService.findById("medicalRecords", order.medicalRecordId)
      if (medicalRecord) {
        const notes = appendLabReviewNote(medicalRecord.notes, labOrderId, reviewedAt, reviewedByDoctorName)
        await CollectionService.updateItem("medicalRecords", medicalRecord.id, { notes })
      }
    }

    return CollectionService.updateItem("labOrders", labOrderId, {
      status: "reviewed",
      notes: appendLabReviewNote(order.notes, labOrderId, reviewedAt, reviewedByDoctorName),
      reviewedAt,
      reviewedByDoctorId,
      reviewedByDoctorName,
      updatedAt: reviewedAt,
    })
  }
}