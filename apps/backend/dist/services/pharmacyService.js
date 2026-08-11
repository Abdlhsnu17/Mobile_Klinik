"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyService = void 0;
const medicine_repository_1 = require("../modules/medicine/medicine.repository");
const medicine_service_1 = require("../modules/medicine/medicine.service");
const utils_1 = require("../utils");
const httpError_1 = require("../utils/httpError");
const billingService_1 = require("./billingService");
const collectionService_1 = require("./collectionService");
const DISPENSED_STATUSES = ["dispensed", "fulfilled"];
const TERMINAL_STATUSES = ["dispensed", "fulfilled", "cancelled"];
class PharmacyService {
    static async list() {
        return collectionService_1.CollectionService.list("pharmacyRequests");
    }
    static async getByRecord(recordId) {
        const requests = await this.list();
        return requests.find((request) => request.medicalRecordId === recordId) ?? null;
    }
    static async createFromMedicalRecord(record) {
        if (!record.prescription || record.prescription.length === 0)
            return null;
        const patient = (await collectionService_1.CollectionService.findById("patients", record.patientId)) ??
            { name: "Pasien tidak dikenal" };
        const doctor = await collectionService_1.CollectionService.findById("doctors", record.doctorId);
        const existing = await this.getByRecord(record.id);
        if (existing)
            return existing;
        const payload = {
            medicalRecordId: record.id,
            patientId: record.patientId,
            patientName: patient.name,
            doctorId: doctor?.id,
            doctorName: doctor?.name,
            items: record.prescription,
            status: "requested",
            requestedAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        };
        return collectionService_1.CollectionService.createItem("pharmacyRequests", payload);
    }
    static async syncFromMedicalRecord(record) {
        const existingRequest = await this.getByRecord(record.id);
        const hasPrescription = record.prescription && record.prescription.length > 0;
        if (existingRequest) {
            if (hasPrescription) {
                // Update resep pada permintaan yang sudah ada
                const payload = {
                    items: record.prescription,
                    updatedAt: (0, utils_1.now)(),
                };
                return collectionService_1.CollectionService.updateItem("pharmacyRequests", existingRequest.id, payload);
            }
            // Hapus permintaan jika resep dikosongkan
            return collectionService_1.CollectionService.deleteItem("pharmacyRequests", existingRequest.id);
        }
        if (hasPrescription) {
            // Buat permintaan baru jika belum ada
            return this.createFromMedicalRecord(record);
        }
        return null;
    }
    static async updateStatus(id, status, notes) {
        const existing = await collectionService_1.CollectionService.findById("pharmacyRequests", id);
        if (!existing)
            return null;
        const isReturnFromDispensed = status === "cancelled" && DISPENSED_STATUSES.includes(existing.status);
        if (TERMINAL_STATUSES.includes(existing.status) && existing.status !== status && !isReturnFromDispensed) {
            throw (0, httpError_1.createHttpError)(409, "Status permintaan farmasi sudah final dan tidak dapat diubah.");
        }
        if (DISPENSED_STATUSES.includes(status) && !DISPENSED_STATUSES.includes(existing.status)) {
            await this.dispenseStock(existing);
        }
        if (isReturnFromDispensed) {
            await this.returnStock(existing);
        }
        const payload = {
            status,
            updatedAt: (0, utils_1.now)(),
        };
        if (status === "verified" || status === "processing")
            payload.verificationNotes = notes;
        if (status === "dispensed" || status === "fulfilled") {
            payload.dispensingNotes = notes;
            payload.fulfilledAt = (0, utils_1.now)();
        }
        const updated = await collectionService_1.CollectionService.updateItem("pharmacyRequests", id, payload);
        await billingService_1.BillingService.syncByRecordId(existing.medicalRecordId);
        return updated;
    }
    static async dispenseStock(request) {
        const items = request.items ?? request.prescription ?? [];
        // Menggabungkan validasi dan update dalam satu loop untuk mengurangi race condition.
        // Meskipun tidak sepenuhnya transaksional tanpa database transaction,
        // ini lebih aman daripada memvalidasi semua lalu mengupdate semua.
        //
        // Pengurangan stok didelegasikan ke medicineService agar mengikuti FEFO:
        // batch yang paling cepat kedaluwarsa dihabiskan lebih dulu, dan batch yang
        // sudah lewat tanggal kedaluwarsa tidak pernah ikut terserahkan.
        for (const item of items) {
            const medicine = await medicine_repository_1.medicineRepository.findById(item.medicineId);
            if (!medicine) {
                throw (0, httpError_1.createHttpError)(404, `Obat ${item.medicineName} tidak ditemukan.`);
            }
            await medicine_service_1.medicineService.consumeStockFefo({
                medicineId: item.medicineId,
                quantity: item.quantity,
                referenceId: request.id,
                notes: `Dispensed for patient: ${request.patientName}`,
            });
        }
    }
    static async returnStock(request) {
        const items = request.items ?? request.prescription ?? [];
        // Alokasi batch saat penyerahan dibaca ulang dari kartu stok supaya obat
        // kembali ke batch asalnya, bukan menumpuk di batch yang kebetulan terbaru.
        const allocations = (await medicine_repository_1.medicineRepository.findDispenseAllocations(request.id)) ?? [];
        if (allocations.length > 0) {
            const byMedicine = new Map();
            for (const allocation of allocations) {
                const entries = byMedicine.get(allocation.medicineId) ?? [];
                entries.push({ batchId: allocation.batchId, quantity: allocation.quantity });
                byMedicine.set(allocation.medicineId, entries);
            }
            for (const [medicineId, entries] of byMedicine) {
                await medicine_service_1.medicineService.returnStockToBatches({
                    medicineId,
                    entries,
                    referenceId: request.id,
                    notes: `Returned from pharmacy request for patient: ${request.patientName}`,
                });
            }
            return;
        }
        // Penyerahan lama yang belum punya jejak alokasi: kembalikan sesuai item resep.
        for (const item of items) {
            const medicine = await medicine_repository_1.medicineRepository.findById(item.medicineId);
            if (!medicine) {
                throw (0, httpError_1.createHttpError)(404, `Obat ${item.medicineName} tidak ditemukan.`);
            }
            await medicine_service_1.medicineService.returnStockToBatches({
                medicineId: item.medicineId,
                entries: [{ batchId: null, quantity: item.quantity }],
                referenceId: request.id,
                notes: `Returned from pharmacy request for patient: ${request.patientName}`,
            });
        }
    }
}
exports.PharmacyService = PharmacyService;
//# sourceMappingURL=pharmacyService.js.map