"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collectionService_1 = require("../services/collectionService");
const labOrderService_1 = require("../services/labOrderService");
jest.mock("../services/collectionService");
const mockedCollectionService = collectionService_1.CollectionService;
describe("LabOrderService.syncFromMedicalRecord", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it("tidak membuat order lab bila keputusan klinis bukan lab-required", async () => {
        mockedCollectionService.list.mockResolvedValue([]);
        const result = await labOrderService_1.LabOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            clinicalDecision: "prescription",
        });
        expect(result).toBeNull();
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
    });
    it("membatalkan order lab yang masih requested bila keputusan klinis berubah", async () => {
        mockedCollectionService.list.mockResolvedValue([
            { id: "order-1", medicalRecordId: "mr-1", status: "requested" },
        ]);
        mockedCollectionService.updateItem.mockResolvedValue({
            id: "order-1",
            status: "cancelled",
        });
        const result = await labOrderService_1.LabOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            clinicalDecision: "prescription",
        });
        expect(mockedCollectionService.updateItem).toHaveBeenCalledWith("labOrders", "order-1", expect.objectContaining({ status: "cancelled" }));
        expect(result).toMatchObject({ status: "cancelled" });
    });
    it("membuat order lab baru saat keputusan klinis lab-required", async () => {
        mockedCollectionService.list.mockImplementation(async (collection) => {
            if (collection === "labOrders")
                return [];
            if (collection === "services")
                return [{ id: "svc-1", name: "Darah Lengkap", category: "Laboratorium" }];
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
        const result = await labOrderService_1.LabOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            appointmentId: "appt-1",
            clinicalDecision: "lab-required",
        });
        expect(mockedCollectionService.createItem).toHaveBeenCalledWith("labOrders", expect.objectContaining({
            patientId: "patient-1",
            patientName: "Budi",
            doctorName: "dr. Ani",
            tests: ["Darah Lengkap"],
            status: "requested",
        }));
        expect(result).toMatchObject({ id: "order-new" });
    });
    it("tidak mengubah order yang sudah completed", async () => {
        mockedCollectionService.list.mockImplementation(async (collection) => {
            if (collection === "labOrders")
                return [{ id: "order-1", medicalRecordId: "mr-1", status: "completed" }];
            return [];
        });
        const result = await labOrderService_1.LabOrderService.syncFromMedicalRecord({
            id: "mr-1",
            patientId: "patient-1",
            doctorId: "doctor-1",
            clinicalDecision: "lab-required",
        });
        expect(mockedCollectionService.updateItem).not.toHaveBeenCalled();
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
        expect(result).toMatchObject({ id: "order-1", status: "completed" });
    });
});
//# sourceMappingURL=labOrderService.test.js.map