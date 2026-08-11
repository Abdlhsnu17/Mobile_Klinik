"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalEquipmentService = void 0;
const collectionService_1 = require("./collectionService");
function getUsedEquipmentIds(record) {
    return new Set((record?.equipmentsUsed ?? []).map((usage) => usage.equipmentId).filter(Boolean));
}
class MedicalEquipmentService {
    static async syncFromMedicalRecord(record, previousRecord) {
        const currentIds = getUsedEquipmentIds(record);
        const previousIds = getUsedEquipmentIds(previousRecord);
        for (const equipmentId of currentIds) {
            const equipment = await collectionService_1.CollectionService.findById("medicalEquipments", equipmentId);
            if (!equipment || equipment.status === "Digunakan")
                continue;
            await collectionService_1.CollectionService.updateItem("medicalEquipments", equipmentId, { status: "Digunakan" });
        }
        for (const equipmentId of previousIds) {
            if (currentIds.has(equipmentId))
                continue;
            const equipment = await collectionService_1.CollectionService.findById("medicalEquipments", equipmentId);
            if (!equipment || equipment.status === "Tidak Aktif")
                continue;
            await collectionService_1.CollectionService.updateItem("medicalEquipments", equipmentId, { status: "Tersedia" });
        }
    }
    static async releaseFromMedicalRecord(record) {
        if (!record)
            return;
        const equipmentIds = getUsedEquipmentIds(record);
        for (const equipmentId of equipmentIds) {
            const equipment = await collectionService_1.CollectionService.findById("medicalEquipments", equipmentId);
            if (!equipment || equipment.status === "Tidak Aktif")
                continue;
            await collectionService_1.CollectionService.updateItem("medicalEquipments", equipmentId, { status: "Tersedia" });
        }
    }
}
exports.MedicalEquipmentService = MedicalEquipmentService;
//# sourceMappingURL=medicalEquipmentService.js.map