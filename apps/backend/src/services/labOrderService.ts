import type { LabOrder, MedicalRecord } from "../types"
import { now } from "../utils"
import { CollectionService } from "./collectionService"

export class LabOrderService {
  static async getByRecord(medicalRecordId: string) {
    const orders = await CollectionService.list("labOrders")
    return orders.find((order) => order.medicalRecordId === medicalRecordId) ?? null
  }

  static async syncFromMedicalRecord(record: MedicalRecord) {
    const existing = await this.getByRecord(record.id)
    const needsLab = record.clinicalDecision === "lab-required"

    if (!needsLab) {
      if (existing && existing.status === "requested") {
        return CollectionService.updateItem("labOrders", existing.id, {
          status: "cancelled",
          notes: "Order lab dibatalkan karena keputusan klinis berubah.",
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
    const labServiceNames = serviceIds
      .map((serviceId) => services.find((service) => service.id === serviceId))
      .filter((service) => service?.category === "Laboratorium")
      .map((service) => service!.name)
    const tests = labServiceNames.length > 0 ? labServiceNames : ["Pemeriksaan Laboratorium"]
    const payload: Partial<LabOrder> = {
      patientId: record.patientId,
      patientName: patient?.name ?? "Pasien tidak dikenal",
      medicalRecordId: record.id,
      doctorId: record.doctorId,
      doctorName: doctor?.name ?? record.doctorName,
      tests,
      priority: "routine",
      status: "requested",
      notes: record.notes,
      updatedAt: now(),
    }

    if (existing) {
      if (existing.status === "completed" || existing.status === "reviewed") return existing
      return CollectionService.updateItem("labOrders", existing.id, payload)
    }

    return CollectionService.createItem("labOrders", {
      ...payload,
      requestedAt: now(),
    })
  }
}
