"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const httpError_1 = require("../utils/httpError");
const auditService_1 = require("./auditService");
const billingService_1 = require("./billingService");
const collectionService_1 = require("./collectionService");
const labOrderService_1 = require("./labOrderService");
const medicalEquipmentService_1 = require("./medicalEquipmentService");
const notificationService_1 = require("./notificationService");
const pharmacyService_1 = require("./pharmacyService");
const radiologyOrderService_1 = require("./radiologyOrderService");
const referralService_1 = require("./referralService");
const STARTABLE_APPOINTMENT_STATUS = ["Dipanggil"];
const FINISHABLE_APPOINTMENT_STATUS = ["Diperiksa"];
const buildDoctorName = (doctor) => doctor?.name ?? "Dokter";
class WorkflowService {
    static async registerVisit(payload) {
        const patient = await collectionService_1.CollectionService.findById("patients", payload.patientId);
        if (!patient) {
            throw (0, httpError_1.createHttpError)(404, "Pasien tidak ditemukan");
        }
        const doctor = payload.doctorId
            ? await collectionService_1.CollectionService.findById("doctors", payload.doctorId)
            : null;
        if (payload.doctorId && !doctor) {
            throw (0, httpError_1.createHttpError)(404, "Dokter tidak ditemukan");
        }
        const services = await collectionService_1.CollectionService.list("services");
        const serviceIds = payload.serviceIds?.length
            ? payload.serviceIds
            : payload.serviceId
                ? [payload.serviceId]
                : [];
        const selectedServices = serviceIds
            .map((serviceId) => services.find((service) => service.id === serviceId))
            .filter((service) => Boolean(service));
        const appointment = await collectionService_1.CollectionService.createItem("appointments", {
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
        });
        await notificationService_1.NotificationService.scheduleAppointmentReminder(appointment);
        return appointment;
    }
    static async startExam(appointmentId) {
        const appointment = await collectionService_1.CollectionService.findById("appointments", appointmentId);
        if (!appointment) {
            throw (0, httpError_1.createHttpError)(404, "Kunjungan tidak ditemukan");
        }
        if (!STARTABLE_APPOINTMENT_STATUS.includes(appointment.status)) {
            throw (0, httpError_1.createHttpError)(409, `Status kunjungan ${appointment.status} tidak dapat memulai pemeriksaan.`);
        }
        if (!appointment.doctorId || !(appointment.serviceIds?.length || appointment.serviceId)) {
            throw (0, httpError_1.createHttpError)(409, "Pemeriksaan awal, dokter, dan layanan harus dilengkapi terlebih dahulu");
        }
        return collectionService_1.CollectionService.updateItem("appointments", appointmentId, {
            status: "Diperiksa",
        });
    }
    static async finishExam(params) {
        const appointment = await collectionService_1.CollectionService.findById("appointments", params.appointmentId);
        if (!appointment) {
            throw (0, httpError_1.createHttpError)(404, "Kunjungan tidak ditemukan");
        }
        if (!FINISHABLE_APPOINTMENT_STATUS.includes(appointment.status)) {
            throw (0, httpError_1.createHttpError)(409, "Kunjungan belum dalam status pemeriksaan aktif");
        }
        const medicalRecords = await collectionService_1.CollectionService.list("medicalRecords");
        const existingRecord = medicalRecords.find((record) => record.appointmentId === appointment.id);
        const doctorId = params.doctorId ?? appointment.doctorId;
        const doctorName = params.doctorName ?? appointment.doctorName ?? buildDoctorName(null);
        const payload = {
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
        };
        const medicalRecord = existingRecord
            ? await collectionService_1.CollectionService.updateItem("medicalRecords", existingRecord.id, payload)
            : await collectionService_1.CollectionService.createItem("medicalRecords", payload);
        if (!medicalRecord) {
            throw (0, httpError_1.createHttpError)(500, "Gagal menyimpan rekam medis");
        }
        await collectionService_1.CollectionService.updateItem("appointments", appointment.id, {
            status: "Selesai",
        });
        await Promise.all([
            pharmacyService_1.PharmacyService.syncFromMedicalRecord(medicalRecord),
            labOrderService_1.LabOrderService.syncFromMedicalRecord(medicalRecord),
            radiologyOrderService_1.RadiologyOrderService.syncFromMedicalRecord(medicalRecord),
            billingService_1.BillingService.syncFromMedicalRecord(medicalRecord),
            medicalEquipmentService_1.MedicalEquipmentService.syncFromMedicalRecord(medicalRecord, existingRecord),
            referralService_1.ReferralService.createFromMedicalRecord(medicalRecord, { id: doctorId, name: doctorName }, { id: appointment.patientId, name: appointment.patientName }),
        ]);
        return {
            appointmentId: appointment.id,
            medicalRecord,
        };
    }
    static async finalizeMedicalRecord(params) {
        const record = await collectionService_1.CollectionService.findById("medicalRecords", params.medicalRecordId);
        if (!record) {
            throw (0, httpError_1.createHttpError)(404, "Rekam medis tidak ditemukan");
        }
        if (record.status === "locked") {
            throw (0, httpError_1.createHttpError)(409, "Rekam medis sudah dikunci");
        }
        const updated = await collectionService_1.CollectionService.updateItem("medicalRecords", params.medicalRecordId, {
            status: "locked",
            lockedAt: new Date().toISOString(),
            lockedBy: params.user?.id,
        });
        if (!updated) {
            throw (0, httpError_1.createHttpError)(500, "Gagal mengunci rekam medis");
        }
        await auditService_1.AuditService.record({
            collection: "medicalRecords",
            itemId: updated.id,
            action: "lock",
            user: params.user,
            before: record,
            after: updated,
            reason: params.reason,
        });
        return updated;
    }
    static async syncBilling(medicalRecordId) {
        const billing = await billingService_1.BillingService.syncByRecordId(medicalRecordId);
        if (!billing) {
            throw (0, httpError_1.createHttpError)(404, "Rekam medis untuk sinkronisasi billing tidak ditemukan");
        }
        return billing;
    }
    static async createPayment(payload) {
        return billingService_1.BillingService.recordPayment(payload);
    }
    static async createPharmacyRequestFromRecord(medicalRecordId) {
        const record = await collectionService_1.CollectionService.findById("medicalRecords", medicalRecordId);
        if (!record) {
            throw (0, httpError_1.createHttpError)(404, "Rekam medis tidak ditemukan");
        }
        const request = await pharmacyService_1.PharmacyService.createFromMedicalRecord(record);
        if (!request) {
            throw (0, httpError_1.createHttpError)(422, "Resep pada rekam medis kosong, permintaan farmasi tidak dapat dibuat");
        }
        return request;
    }
    static async verifyPharmacyRequest(id, notes) {
        const updated = await pharmacyService_1.PharmacyService.updateStatus(id, "verified", notes);
        if (!updated) {
            throw (0, httpError_1.createHttpError)(404, "Permintaan farmasi tidak ditemukan");
        }
        return updated;
    }
    static async processPharmacyRequest(id, notes) {
        const request = await collectionService_1.CollectionService.findById("pharmacyRequests", id);
        if (!request) {
            throw (0, httpError_1.createHttpError)(404, "Permintaan farmasi tidak ditemukan");
        }
        if (!["verified", "requested"].includes(request.status)) {
            throw (0, httpError_1.createHttpError)(409, `Status ${request.status} tidak dapat diproses`);
        }
        const updated = await pharmacyService_1.PharmacyService.updateStatus(id, "processing", notes);
        if (!updated) {
            throw (0, httpError_1.createHttpError)(404, "Permintaan farmasi tidak ditemukan");
        }
        return updated;
    }
    static async dispensePharmacyRequest(id, notes) {
        const request = await collectionService_1.CollectionService.findById("pharmacyRequests", id);
        if (!request) {
            throw (0, httpError_1.createHttpError)(404, "Permintaan farmasi tidak ditemukan");
        }
        if (!["verified", "processing", "requested"].includes(request.status)) {
            throw (0, httpError_1.createHttpError)(409, `Status ${request.status} tidak dapat dilakukan dispensing`);
        }
        const updated = await pharmacyService_1.PharmacyService.updateStatus(id, "dispensed", notes);
        if (!updated) {
            throw (0, httpError_1.createHttpError)(404, "Permintaan farmasi tidak ditemukan");
        }
        return updated;
    }
    static async cancelPharmacyRequest(id, notes) {
        const request = await collectionService_1.CollectionService.findById("pharmacyRequests", id);
        if (!request) {
            throw (0, httpError_1.createHttpError)(404, "Permintaan farmasi tidak ditemukan");
        }
        if (!["requested", "verified", "processing", "dispensed", "fulfilled"].includes(request.status)) {
            throw (0, httpError_1.createHttpError)(409, `Status ${request.status} tidak dapat dibatalkan`);
        }
        const updated = await pharmacyService_1.PharmacyService.updateStatus(id, "cancelled", notes);
        if (!updated) {
            throw (0, httpError_1.createHttpError)(404, "Permintaan farmasi tidak ditemukan");
        }
        return updated;
    }
}
exports.WorkflowService = WorkflowService;
//# sourceMappingURL=workflowService.js.map