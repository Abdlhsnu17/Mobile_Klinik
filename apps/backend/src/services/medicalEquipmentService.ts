import type { MedicalRecord } from "../types";
import { CollectionService } from "./collectionService";

function getUsedEquipmentIds(record?: MedicalRecord | null) {
  return new Set((record?.equipmentsUsed ?? []).map((usage) => usage.equipmentId).filter(Boolean))
}

export class MedicalEquipmentService {
  static async syncFromMedicalRecord(record: MedicalRecord, previousRecord?: MedicalRecord | null) {
    const currentIds = getUsedEquipmentIds(record)
    const previousIds = getUsedEquipmentIds(previousRecord)

    for (const equipmentId of currentIds) {
      const equipment = await CollectionService.findById("medicalEquipments", equipmentId)
      if (!equipment || equipment.status === "Digunakan") continue
      await CollectionService.updateItem("medicalEquipments", equipmentId, { status: "Digunakan" })
    }

    for (const equipmentId of previousIds) {
      if (currentIds.has(equipmentId)) continue
      const equipment = await CollectionService.findById("medicalEquipments", equipmentId)
      if (!equipment || equipment.status === "Tidak Aktif") continue
      await CollectionService.updateItem("medicalEquipments", equipmentId, { status: "Tersedia" })
    }
  }

  static async releaseFromMedicalRecord(record: MedicalRecord | null | undefined) {
    if (!record) return
    const equipmentIds = getUsedEquipmentIds(record)
    for (const equipmentId of equipmentIds) {
      const equipment = await CollectionService.findById("medicalEquipments", equipmentId)
      if (!equipment || equipment.status === "Tidak Aktif") continue
      await CollectionService.updateItem("medicalEquipments", equipmentId, { status: "Tersedia" })
    }
  }
}