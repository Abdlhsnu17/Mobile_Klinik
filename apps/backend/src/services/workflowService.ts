import type { AuthTokenPayload } from "../middlewares/auth";
import type { Appointment, MedicalRecord, PaymentRecord } from "../types";
import { createHttpError } from "../utils/httpError";
import { AuditService } from "./auditService";
import { BillingService } from "./billingService";
import { CollectionService } from "./collectionService";
import { LabOrderService } from "./labOrderService";
import { MedicalEquipmentService } from "./medicalEquipmentService";
import { NotificationService } from "./notificationService";
import { PharmacyService } from "./pharmacyService";
import { RadiologyOrderService } from "./radiologyOrderService";
import { ReferralService } from "./referralService";

type AppointmentStatus = Appointment["status"]

const STARTABLE_APPOINTMENT_STATUS: AppointmentStatus[] = ["Dipanggil"]
const FINISHABLE_APPOINTMENT_STATUS: AppointmentStatus[] = ["Diperiksa"]

const buildDoctorName = (doctor: { name?: string | null } | null | undefined) => doctor?.name ?? "Dokter"

export class WorkflowService {
  static async registerVisit(payload: {
    patientId: string
    doctorId?: string
    date: string
    time: string
    serviceId?: string
    serviceIds?: string[]
    notes?: string
  }) {
    const patient = await CollectionService.findById("patients", payload.patientId)
    if (!patient) {
      throw createHttpError(404, "Pasien tidak ditemukan")
    }

    const doctor = payload.doctorId
      ? await CollectionService.findById("doctors", payload.doctorId)
      : null
    if (payload.doctorId && !doctor) {
      throw createHttpError(404, "Dokter tidak ditemukan")
    }

    const services = await CollectionService.list("services")
    const serviceIds = payload.serviceIds?.length
      ? payload.serviceIds
      : payload.serviceId
        ? [payload.serviceId]
        : []

    const selectedServices = serviceIds
      .map((serviceId) => services.find((service) => service.id === serviceId))
      .filter((service): service is NonNullable<typeof service> => Boolean(service))

    const appointment = await CollectionService.createItem("appointments", {
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor?.id ?? "",
      doctorName: doctor?.name ?? "Belum ditentukan",
      serviceId: selectedServices[0]?.id ?? "",
      serviceName: selectedServices[0]?.name ?? "",
      serviceIds: selectedServices.map((service) => service.id),
      serviceNames: selectedServices.map((service) => service.name),
      date: payload.date,
      time: payload.time,
      status: "Menunggu",
      notes: payload.notes,
    })

    await NotificationService.scheduleAppointmentReminder(appointment)

    return appointment
  }

  static async startExam(appointmentId: string) {
    const appointment = await CollectionService.findById("appointments", appointmentId)
    if (!appointment) {
      throw createHttpError(404, "Kunjungan tidak ditemukan")
    }
    if (!STARTABLE_APPOINTMENT_STATUS.includes(appointment.status)) {
      throw createHttpError(409, `Status kunjungan ${appointment.status} tidak dapat memulai pemeriksaan.`)
    }
    if (!appointment.doctorId || !(appointment.serviceIds?.length || appointment.serviceId)) {
      throw createHttpError(409, "Pemeriksaan awal, dokter, dan layanan harus dilengkapi terlebih dahulu")
    }

    return CollectionService.updateItem("appointments", appointmentId, {
      status: "Diperiksa",
    })
  }

  static async finishExam(params: {
    appointmentId: string
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
  }) {
    const appointment = await CollectionService.findById("appointments", params.appointmentId)
    if (!appointment) {
      throw createHttpError(404, "Kunjungan tidak ditemukan")
    }
    if (!FINISHABLE_APPOINTMENT_STATUS.includes(appointment.status)) {
      throw createHttpError(409, "Kunjungan belum dalam status pemeriksaan aktif")
    }

    const medicalRecords = await CollectionService.list("medicalRecords")
    const existingRecord = medicalRecords.find((record) => record.appointmentId === appointment.id)

    const doctorId = params.doctorId ?? appointment.doctorId
    const doctorName = params.doctorName ?? appointment.doctorName ?? buildDoctorName(null)

    const payload: Partial<MedicalRecord> = {
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      doctorId,
      doctorName,
      date: appointment.date,
      diagnosis: params.diagnosis,
      symptoms: params.symptoms,
      treatment: params.treatment,
      soap: params.soap,
      diagnosisCodes: params.diagnosisCodes,
      procedureCodes: params.procedureCodes,
      clinicalHistory: params.clinicalHistory,
      prescription: params.prescription,
      equipmentsUsed: params.equipmentsUsed,
      vitalSigns: params.vitalSigns,
      clinicalDecision: params.clinicalDecision,
      referralDestination: params.referralDestination,
      observationNotes: params.observationNotes,
      notes: params.notes,
      status: "completed",
    }

    const medicalRecord = existingRecord
      ? await CollectionService.updateItem("medicalRecords", existingRecord.id, payload)
      : await CollectionService.createItem("medicalRecords", payload)

    if (!medicalRecord) {
      throw createHttpError(500, "Gagal menyimpan rekam medis")
    }

    await CollectionService.updateItem("appointments", appointment.id, {
      status: "Selesai",
    })

    await Promise.all([
      PharmacyService.syncFromMedicalRecord(medicalRecord),
      LabOrderService.syncFromMedicalRecord(medicalRecord),
      RadiologyOrderService.syncFromMedicalRecord(medicalRecord),
      BillingService.syncFromMedicalRecord(medicalRecord),
      MedicalEquipmentService.syncFromMedicalRecord(medicalRecord, existingRecord),
      ReferralService.createFromMedicalRecord(
        medicalRecord,
        { id: doctorId, name: doctorName },
        { id: appointment.patientId, name: appointment.patientName }
      ),
    ])

    return {
      appointmentId: appointment.id,
      medicalRecord,
    }
  }

  static async finalizeMedicalRecord(params: {
    medicalRecordId: string
    user?: AuthTokenPayload
    reason?: string
  }) {
    const record = await CollectionService.findById("medicalRecords", params.medicalRecordId)
    if (!record) {
      throw createHttpError(404, "Rekam medis tidak ditemukan")
    }
    if (record.status === "locked") {
      throw createHttpError(409, "Rekam medis sudah dikunci")
    }

    const updated = await CollectionService.updateItem("medicalRecords", params.medicalRecordId, {
      status: "locked",
      lockedAt: new Date().toISOString(),
      lockedBy: params.user?.id,
    })

    if (!updated) {
      throw createHttpError(500, "Gagal mengunci rekam medis")
    }

    await AuditService.record({
      collection: "medicalRecords",
      itemId: updated.id,
      action: "lock",
      user: params.user,
      before: record,
      after: updated,
      reason: params.reason,
    })

    return updated
  }

  static async syncBilling(medicalRecordId: string) {
    const billing = await BillingService.syncByRecordId(medicalRecordId)
    if (!billing) {
      throw createHttpError(404, "Rekam medis untuk sinkronisasi billing tidak ditemukan")
    }
    return billing
  }

  static async createPayment(payload: Partial<PaymentRecord>) {
    return BillingService.recordPayment(payload)
  }

  static async createPharmacyRequestFromRecord(medicalRecordId: string) {
    const record = await CollectionService.findById("medicalRecords", medicalRecordId)
    if (!record) {
      throw createHttpError(404, "Rekam medis tidak ditemukan")
    }

    const request = await PharmacyService.createFromMedicalRecord(record)
    if (!request) {
      throw createHttpError(422, "Resep pada rekam medis kosong, permintaan farmasi tidak dapat dibuat")
    }

    return request
  }

  static async verifyPharmacyRequest(id: string, notes?: string) {
    const updated = await PharmacyService.updateStatus(id, "verified", notes)
    if (!updated) {
      throw createHttpError(404, "Permintaan farmasi tidak ditemukan")
    }
    return updated
  }

  static async processPharmacyRequest(id: string, notes?: string) {
    const request = await CollectionService.findById("pharmacyRequests", id)
    if (!request) {
      throw createHttpError(404, "Permintaan farmasi tidak ditemukan")
    }

    if (!["verified", "requested"].includes(request.status)) {
      throw createHttpError(409, `Status ${request.status} tidak dapat diproses`)
    }

    const updated = await PharmacyService.updateStatus(id, "processing", notes)
    if (!updated) {
      throw createHttpError(404, "Permintaan farmasi tidak ditemukan")
    }
    return updated
  }

  static async dispensePharmacyRequest(id: string, notes?: string) {
    const request = await CollectionService.findById("pharmacyRequests", id)
    if (!request) {
      throw createHttpError(404, "Permintaan farmasi tidak ditemukan")
    }

    if (!["verified", "processing", "requested"].includes(request.status)) {
      throw createHttpError(409, `Status ${request.status} tidak dapat dilakukan dispensing`)
    }

    const updated = await PharmacyService.updateStatus(id, "dispensed", notes)
    if (!updated) {
      throw createHttpError(404, "Permintaan farmasi tidak ditemukan")
    }

    return updated
  }

  static async cancelPharmacyRequest(id: string, notes?: string) {
    const request = await CollectionService.findById("pharmacyRequests", id)
    if (!request) {
      throw createHttpError(404, "Permintaan farmasi tidak ditemukan")
    }

    if (!["requested", "verified", "processing", "dispensed", "fulfilled"].includes(request.status)) {
      throw createHttpError(409, `Status ${request.status} tidak dapat dibatalkan`)
    }

    const updated = await PharmacyService.updateStatus(id, "cancelled", notes)
    if (!updated) {
      throw createHttpError(404, "Permintaan farmasi tidak ditemukan")
    }

    return updated
  }
}
