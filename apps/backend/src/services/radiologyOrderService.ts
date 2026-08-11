import type { MedicalRecord, RadiologyOrder } from "../types"
import { now } from "../utils"
import { CollectionService } from "./collectionService"

function appendRadiologyReviewNote(
  notes: string | undefined,
  orderId: string,
  reviewedAt: string,
  doctorName?: string,
) {
  const reviewer = doctorName ?? "dokter"
  const reviewNote = `Hasil radiologi untuk order ${orderId} telah direview oleh ${reviewer} pada ${reviewedAt}.`
  if (!notes) return reviewNote
  if (notes.includes(reviewNote)) return notes
  return `${notes}\n${reviewNote}`
}

export class RadiologyOrderService {
  static async getByRecord(medicalRecordId: string) {
    const orders = await CollectionService.list("radiologyOrders")
    return orders.find((order) => order.medicalRecordId === medicalRecordId) ?? null
  }

  static async syncFromMedicalRecord(record: MedicalRecord) {
    const existing = await this.getByRecord(record.id)
    const needsRadiology = record.clinicalDecision === "radiology-required"

    if (!needsRadiology) {
      if (existing && existing.status === "requested") {
        return CollectionService.updateItem("radiologyOrders", existing.id, {
          status: "cancelled",
          updatedAt: now(),
        })
      }
      return null
    }

    const [patient, doctor, appointment, services] = await Promise.all([
      CollectionService.findById("patients", record.patientId),
      CollectionService.findById("doctors", record.doctorId),
      CollectionService.findById("appointments", record.appointmentId),
      CollectionService.list("services"),
    ])
    const serviceIds = appointment?.serviceIds?.length
      ? appointment.serviceIds
      : appointment?.serviceId
        ? [appointment.serviceId]
        : []
    const radiologyServiceNames = serviceIds
      .map((serviceId) => services.find((service) => service.id === serviceId))
      .filter((service) => service?.category === "Radiologi")
      .map((service) => service!.name)
    const study = radiologyServiceNames.length > 0
      ? radiologyServiceNames.join(", ")
      : "Pemeriksaan Radiologi"
    const payload: Partial<RadiologyOrder> = {
      patientId: record.patientId,
      patientName: patient?.name ?? "Pasien tidak dikenal",
      medicalRecordId: record.id,
      doctorId: record.doctorId,
      doctorName: doctor?.name ?? record.doctorName,
      study,
      priority: "routine",
      status: "requested",
      indication: record.diagnosis || record.symptoms,
      updatedAt: now(),
    }

    if (existing) {
      if (existing.status === "reported" || existing.status === "reviewed") return existing
      return CollectionService.updateItem("radiologyOrders", existing.id, payload)
    }

    return CollectionService.createItem("radiologyOrders", {
      ...payload,
      requestedAt: now(),
    })
  }

  static async syncReportToRecord(order: RadiologyOrder) {
    if (!order.medicalRecordId) return null

    const hasReport = Boolean(order.findings || order.impression)
    const isReported = order.status === "reported" || order.status === "reviewed"
    if (!hasReport || !isReported) return null

    const medicalRecord = await CollectionService.findById("medicalRecords", order.medicalRecordId)
    if (!medicalRecord) return null

    const reviewedAt = order.reviewedAt ?? now()
    const notes = appendRadiologyReviewNote(
      medicalRecord.notes,
      order.id,
      reviewedAt,
      order.reviewedByDoctorName ?? order.doctorName,
    )
    if (notes === medicalRecord.notes) return medicalRecord

    return CollectionService.updateItem("medicalRecords", medicalRecord.id, { notes })
  }
}
