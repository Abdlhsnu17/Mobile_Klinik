"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabResultService = void 0;
const utils_1 = require("../utils");
const collectionService_1 = require("./collectionService");
function appendLabReviewNote(notes, orderId, reviewedAt, doctorName) {
    const reviewer = doctorName ?? "dokter";
    const reviewNote = `Hasil lab untuk order ${orderId} telah direview oleh ${reviewer} pada ${reviewedAt}.`;
    if (!notes)
        return reviewNote;
    if (notes.includes(reviewNote))
        return notes;
    return `${notes}\n${reviewNote}`;
}
class LabResultService {
    static async syncFromResult(result) {
        if (!result.labOrderId)
            return null;
        return this.syncFromOrderId(result.labOrderId);
    }
    static async syncFromOrderId(labOrderId) {
        if (!labOrderId)
            return null;
        const order = await collectionService_1.CollectionService.findById("labOrders", labOrderId);
        if (!order)
            return null;
        const results = await collectionService_1.CollectionService.list("labResults");
        const linkedResults = results.filter((item) => item.labOrderId === labOrderId);
        if (linkedResults.length === 0) {
            const updatePayload = order.status === "reviewed"
                ? {
                    status: "completed",
                    reviewedAt: undefined,
                    reviewedByDoctorId: undefined,
                    reviewedByDoctorName: undefined,
                    updatedAt: (0, utils_1.now)(),
                }
                : {
                    updatedAt: (0, utils_1.now)(),
                };
            return collectionService_1.CollectionService.updateItem("labOrders", labOrderId, updatePayload);
        }
        const reviewedAt = (0, utils_1.now)();
        const reviewedByDoctorId = order.doctorId;
        const reviewedByDoctorName = order.doctorName;
        if (order.medicalRecordId) {
            const medicalRecord = await collectionService_1.CollectionService.findById("medicalRecords", order.medicalRecordId);
            if (medicalRecord) {
                const notes = appendLabReviewNote(medicalRecord.notes, labOrderId, reviewedAt, reviewedByDoctorName);
                await collectionService_1.CollectionService.updateItem("medicalRecords", medicalRecord.id, { notes });
            }
        }
        return collectionService_1.CollectionService.updateItem("labOrders", labOrderId, {
            status: "reviewed",
            notes: appendLabReviewNote(order.notes, labOrderId, reviewedAt, reviewedByDoctorName),
            reviewedAt,
            reviewedByDoctorId,
            reviewedByDoctorName,
            updatedAt: reviewedAt,
        });
    }
}
exports.LabResultService = LabResultService;
//# sourceMappingURL=labResultService.js.map