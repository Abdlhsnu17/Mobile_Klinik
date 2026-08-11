"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabOrderService = void 0;
const utils_1 = require("../utils");
const collectionService_1 = require("./collectionService");
class LabOrderService {
    static async getByRecord(medicalRecordId) {
        const orders = await collectionService_1.CollectionService.list("labOrders");
        return orders.find((order) => order.medicalRecordId === medicalRecordId) ?? null;
    }
    static async syncFromMedicalRecord(record) {
        const existing = await this.getByRecord(record.id);
        const needsLab = record.clinicalDecision === "lab-required";
        if (!needsLab) {
            if (existing && existing.status === "requested") {
                return collectionService_1.CollectionService.updateItem("labOrders", existing.id, {
                    status: "cancelled",
                    notes: "Order lab dibatalkan karena keputusan klinis berubah.",
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
        const labServiceNames = serviceIds
            .map((serviceId) => services.find((service) => service.id === serviceId))
            .filter((service) => service?.category === "Laboratorium")
            .map((service) => service.name);
        const tests = labServiceNames.length > 0 ? labServiceNames : ["Pemeriksaan Laboratorium"];
        const payload = {
            patientId: record.patientId,
            patientName: patient?.name ?? "Pasien tidak dikenal",
            medicalRecordId: record.id,
            doctorId: record.doctorId,
            doctorName: doctor?.name ?? record.doctorName,
            tests,
            priority: "routine",
            status: "requested",
            notes: record.notes,
            updatedAt: (0, utils_1.now)(),
        };
        if (existing) {
            if (existing.status === "completed" || existing.status === "reviewed")
                return existing;
            return collectionService_1.CollectionService.updateItem("labOrders", existing.id, payload);
        }
        return collectionService_1.CollectionService.createItem("labOrders", {
            ...payload,
            requestedAt: (0, utils_1.now)(),
        });
    }
}
exports.LabOrderService = LabOrderService;
//# sourceMappingURL=labOrderService.js.map