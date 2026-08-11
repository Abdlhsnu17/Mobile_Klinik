"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collectionService_1 = require("../services/collectionService");
const radiologyOrderService_1 = require("../services/radiologyOrderService");
jest.mock("../services/collectionService");
const mockedCollectionService = collectionService_1.CollectionService;
describe("RadiologyOrderService.syncFromMedicalRecord", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it("tidak membuat order radiologi bila keputusan klinis bukan radiology-required", async () => {
        mockedCollectionService.list.mockResolvedValue([]);
        const result = await radiologyOrderService_1.RadiologyOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            clinicalDecision: "prescription",
        });
        expect(result).toBeNull();
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
    });
    it("membatalkan order radiologi yang masih requested bila keputusan klinis berubah", async () => {
        mockedCollectionService.list.mockResolvedValue([
            { id: "order-1", medicalRecordId: "mr-1", status: "requested" },
        ]);
        mockedCollectionService.updateItem.mockResolvedValue({
            id: "order-1",
            status: "cancelled",
        });
        const result = await radiologyOrderService_1.RadiologyOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            clinicalDecision: "prescription",
        });
        expect(mockedCollectionService.updateItem).toHaveBeenCalledWith("radiologyOrders", "order-1", expect.objectContaining({ status: "cancelled" }));
        expect(result).toMatchObject({ status: "cancelled" });
    });
    it("membuat order radiologi baru saat keputusan klinis radiology-required", async () => {
        mockedCollectionService.list.mockImplementation(async (collection) => {
            if (collection === "radiologyOrders")
                return [];
            if (collection === "services")
                return [{ id: "svc-1", name: "Rontgen Thorax", category: "Radiologi" }];
            return [];
        });
        mockedCollectionService.findById.mockImplementation(async (collection, id) => {
            if (collection === "patients")
                return { id, name: "Budi" };
            if (collection === "doctors")
                return { id, name: "dr. Ani" };
            if (collection === "appointments")
                return { id, serviceIds: ["svc-1"] };
            return null;
        });
        mockedCollectionService.createItem.mockImplementation(async (_collection, payload) => ({
            id: "order-new",
            ...payload,
        }));
        const result = await radiologyOrderService_1.RadiologyOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            appointmentId: "appt-1",
            diagnosis: "Suspek pneumonia",
            clinicalDecision: "radiology-required",
        });
        expect(mockedCollectionService.createItem).toHaveBeenCalledWith("radiologyOrders", expect.objectContaining({
            patientId: "patient-1",
            patientName: "Budi",
            doctorName: "dr. Ani",
            study: "Rontgen Thorax",
            indication: "Suspek pneumonia",
            status: "requested",
        }));
        expect(result).toMatchObject({ id: "order-new" });
    });
    it("tidak mengubah order yang sudah reported", async () => {
        mockedCollectionService.list.mockImplementation(async (collection) => {
            if (collection === "radiologyOrders")
                return [{ id: "order-1", medicalRecordId: "mr-1", status: "reported" }];
            return [];
        });
        const result = await radiologyOrderService_1.RadiologyOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            clinicalDecision: "radiology-required",
        });
        expect(mockedCollectionService.updateItem).not.toHaveBeenCalled();
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
        expect(result).toMatchObject({ id: "order-1", status: "reported" });
    });
});
describe("RadiologyOrderService.syncReportToRecord", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it("tidak menulis catatan bila order belum memiliki hasil bacaan", async () => {
        const result = await radiologyOrderService_1.RadiologyOrderService.syncReportToRecord({
            id: "order-1",
            medicalRecordId: "mr-1",
            status: "scheduled",
        });
        expect(result).toBeNull();
        expect(mockedCollectionService.updateItem).not.toHaveBeenCalled();
    });
    it("menulis catatan hasil radiologi ke rekam medis saat order reported", async () => {
        mockedCollectionService.findById.mockResolvedValue({ id: "mr-1", notes: "Catatan awal" });
        mockedCollectionService.updateItem.mockImplementation(async (_collection, _id, payload) => ({
            id: "mr-1",
            ...payload,
        }));
        const result = await radiologyOrderService_1.RadiologyOrderService.syncReportToRecord({
            id: "order-1",
            medicalRecordId: "mr-1",
            status: "reported",
            findings: "Tidak tampak infiltrat",
            doctorName: "dr. Ani",
        });
        expect(mockedCollectionService.updateItem).toHaveBeenCalledWith("medicalRecords", "mr-1", expect.objectContaining({ notes: expect.stringContaining("Hasil radiologi untuk order order-1") }));
        expect(result.notes).toContain("Catatan awal");
    });
    it("idempoten: tidak menduplikasi catatan yang sudah ada", async () => {
        const existingNote = "Hasil radiologi untuk order order-1 telah direview oleh dr. Ani pada 2026-07-24.";
        mockedCollectionService.findById.mockResolvedValue({ id: "mr-1", notes: existingNote });
        const result = await radiologyOrderService_1.RadiologyOrderService.syncReportToRecord({
            id: "order-1",
            medicalRecordId: "mr-1",
            status: "reviewed",
            impression: "Normal",
            reviewedAt: "2026-07-24",
            reviewedByDoctorName: "dr. Ani",
        });
        expect(mockedCollectionService.updateItem).not.toHaveBeenCalled();
        expect(result).toMatchObject({ id: "mr-1" });
    });
});
//# sourceMappingURL=radiologyOrderService.test.js.map