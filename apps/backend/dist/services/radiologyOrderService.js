"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadiologyOrderService = void 0;
const utils_1 = require("../utils");
const collectionService_1 = require("./collectionService");
function appendRadiologyReviewNote(notes, orderId, reviewedAt, doctorName) {
    const reviewer = doctorName ?? "dokter";
    const reviewNote = `Hasil radiologi untuk order ${orderId} telah direview oleh ${reviewer} pada ${reviewedAt}.`;
    if (!notes)
        return reviewNote;
    if (notes.includes(reviewNote))
        return notes;
    return `${notes}\n${reviewNote}`;
}
class RadiologyOrderService {
    static async getByRecord(medicalRecordId) {
        const orders = await collectionService_1.CollectionService.list("radiologyOrders");
        return orders.find((order) => order.medicalRecordId === medicalRecordId) ?? null;
    }
    static async syncFromMedicalRecord(record) {
        const existing = await this.getByRecord(record.id);
        const needsRadiology = record.clinicalDecision === "radiology-required";
        if (!needsRadiology) {
            if (existing && existing.status === "requested") {
                return collectionService_1.CollectionService.updateItem("radiologyOrders", existing.id, {
                    status: "cancelled",
                    updatedAt: (0, utils_1.now)(),
                });
            }
            return null;
        }
        const [patient, doctor, appointment, services] = await Promise.all([
            collectionService_1.CollectionService.findById("patients", record.patientId),
            collectionService_1.CollectionService.findById("doctors", record.doctorId),
            collectionService_1.CollectionService.findById("appointments", record.appointmentId),
            collectionService_1.CollectionService.list("services"),
        ]);
        const serviceIds = appointment?.serviceIds?.length
            ? appointment.serviceIds
            : appointment?.serviceId
                ? [appointment.serviceId]
                : [];
        const radiologyServiceNames = serviceIds
            .map((serviceId) => services.find((service) => service.id === serviceId))
            .filter((service) => service?.category === "Radiologi")
            .map((service) => service.name);
        const study = radiologyServiceNames.length > 0
            ? radiologyServiceNames.join(", ")
            : "Pemeriksaan Radiologi";
        const payload = {
            patientId: record.patientId,
            patientName: patient?.name ?? "Pasien tidak dikenal",
            medicalRecordId: record.id,
            doctorId: record.doctorId,
            doctorName: doctor?.name ?? record.doctorName,
            study,
            priority: "routine",
            status: "requested",
            indication: record.diagnosis || record.symptoms,
            updatedAt: (0, utils_1.now)(),
        };
        if (existing) {
            if (existing.status === "reported" || existing.status === "reviewed")
                return existing;
            return collectionService_1.CollectionService.updateItem("radiologyOrders", existing.id, payload);
        }
        return collectionService_1.CollectionService.createItem("radiologyOrders", {
            ...payload,
            requestedAt: (0, utils_1.now)(),
        });
    }
    static async syncReportToRecord(order) {
        if (!order.medicalRecordId)
            return null;
        const hasReport = Boolean(order.findings || order.impression);
        const isReported = order.status === "reported" || order.status === "reviewed";
        if (!hasReport || !isReported)
            return null;
        const medicalRecord = await collectionService_1.CollectionService.findById("medicalRecords", order.medicalRecordId);
        if (!medicalRecord)
            return null;
        const reviewedAt = order.reviewedAt ?? (0, utils_1.now)();
        const notes = appendRadiologyReviewNote(medicalRecord.notes, order.id, reviewedAt, order.reviewedByDoctorName ?? order.doctorName);
        if (notes === medicalRecord.notes)
            return medicalRecord;
        return collectionService_1.CollectionService.updateItem("medicalRecords", medicalRecord.id, { notes });
    }
}
exports.RadiologyOrderService = RadiologyOrderService;
//# sourceMappingURL=radiologyOrderService.js.map