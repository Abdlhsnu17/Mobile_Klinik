"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const medicine_repository_1 = require("../modules/medicine/medicine.repository");
const medicine_service_1 = require("../modules/medicine/medicine.service");
const billingService_1 = require("../services/billingService");
const collectionService_1 = require("../services/collectionService");
const pharmacyService_1 = require("../services/pharmacyService");
jest.mock("../modules/medicine/medicine.repository");
jest.mock("../modules/medicine/medicine.service");
jest.mock("../services/collectionService");
jest.mock("../services/billingService");
const mockedMedicineRepository = medicine_repository_1.medicineRepository;
const mockedMedicineService = medicine_service_1.medicineService;
const mockedCollectionService = collectionService_1.CollectionService;
const mockedBillingService = billingService_1.BillingService;
describe("PharmacyService.updateStatus", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedBillingService.syncByRecordId.mockResolvedValue(undefined);
    });
    // Pengurangan stok sendiri (termasuk urutan FEFO) diuji di medicineService.fefo.test.ts;
    // di sini yang dijaga adalah PharmacyService mendelegasikannya dengan benar.
    it("mengurangi stok lewat alur FEFO saat dispensing", async () => {
        mockedCollectionService.findById.mockResolvedValue({
            id: "req-1",
            medicalRecordId: "mr-1",
            patientName: "Budi",
            status: "verified",
            items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 2 }],
        });
        mockedMedicineRepository.findById.mockResolvedValue({
            id: "med-1",
            name: "Paracetamol",
            stock: 10,
        });
        mockedMedicineService.consumeStockFefo.mockResolvedValue([
            { batchId: "batch-1", batchNumber: "B1", quantity: 2 },
        ]);
        mockedCollectionService.updateItem.mockResolvedValue({ id: "req-1", status: "dispensed" });
        await pharmacyService_1.PharmacyService.updateStatus("req-1", "dispensed");
        expect(mockedMedicineService.consumeStockFefo).toHaveBeenCalledWith(expect.objectContaining({ medicineId: "med-1", quantity: 2, referenceId: "req-1" }));
    });
    it("membatalkan dispensing bila pengurangan stok ditolak", async () => {
        mockedCollectionService.findById.mockResolvedValue({
            id: "req-1",
            medicalRecordId: "mr-1",
            patientName: "Budi",
            status: "verified",
            items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 5 }],
        });
        mockedMedicineRepository.findById.mockResolvedValue({
            id: "med-1",
            name: "Paracetamol",
            stock: 2,
        });
        mockedMedicineService.consumeStockFefo.mockRejectedValue(Object.assign(new Error("Stok Paracetamol tidak cukup."), { statusCode: 409 }));
        await expect(pharmacyService_1.PharmacyService.updateStatus("req-1", "dispensed")).rejects.toMatchObject({
            statusCode: 409,
        });
        expect(mockedCollectionService.updateItem).not.toHaveBeenCalled();
    });
    it("menolak perubahan status bila permintaan sudah final", async () => {
        mockedCollectionService.findById.mockResolvedValue({
            id: "req-1",
            medicalRecordId: "mr-1",
            status: "fulfilled",
        });
        await expect(pharmacyService_1.PharmacyService.updateStatus("req-1", "verified")).rejects.toMatchObject({
            statusCode: 409,
        });
        expect(mockedCollectionService.updateItem).not.toHaveBeenCalled();
    });
    it("mengembalikan stok ke batch asalnya saat status dibatalkan dari dispensed", async () => {
        mockedCollectionService.findById.mockResolvedValue({
            id: "req-1",
            medicalRecordId: "mr-1",
            patientName: "Budi",
            status: "dispensed",
            items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 3 }],
        });
        mockedMedicineRepository.findDispenseAllocations.mockResolvedValue([
            { medicineId: "med-1", batchId: "batch-1", quantity: 1 },
            { medicineId: "med-1", batchId: "batch-2", quantity: 2 },
        ]);
        mockedCollectionService.updateItem.mockResolvedValue({ id: "req-1", status: "cancelled" });
        await pharmacyService_1.PharmacyService.updateStatus("req-1", "cancelled");
        expect(mockedMedicineService.returnStockToBatches).toHaveBeenCalledWith(expect.objectContaining({
            medicineId: "med-1",
            entries: [
                { batchId: "batch-1", quantity: 1 },
                { batchId: "batch-2", quantity: 2 },
            ],
            referenceId: "req-1",
        }));
    });
    it("mengembalikan stok berdasarkan item resep bila penyerahan lama tak punya jejak alokasi batch", async () => {
        mockedCollectionService.findById.mockResolvedValue({
            id: "req-1",
            medicalRecordId: "mr-1",
            patientName: "Budi",
            status: "dispensed",
            items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 3 }],
        });
        mockedMedicineRepository.findDispenseAllocations.mockResolvedValue([]);
        mockedMedicineRepository.findById.mockResolvedValue({
            id: "med-1",
            name: "Paracetamol",
            stock: 5,
        });
        mockedCollectionService.updateItem.mockResolvedValue({ id: "req-1", status: "cancelled" });
        await pharmacyService_1.PharmacyService.updateStatus("req-1", "cancelled");
        expect(mockedMedicineService.returnStockToBatches).toHaveBeenCalledWith(expect.objectContaining({
            medicineId: "med-1",
            entries: [{ batchId: null, quantity: 3 }],
        }));
    });
});
//# sourceMappingURL=pharmacyService.test.js.map