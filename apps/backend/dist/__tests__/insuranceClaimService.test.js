"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billingService_1 = require("../services/billingService");
const collectionService_1 = require("../services/collectionService");
const insuranceService_1 = require("../services/insuranceService");
jest.mock("../services/collectionService");
const mockedCollectionService = collectionService_1.CollectionService;
const medicalRecord = {
    id: "mr-1",
    patientId: "patient-1",
    appointmentId: "appt-1",
    doctorId: "doctor-1",
    doctorName: "Dr. Klinik",
    date: "2026-07-07",
    diagnosis: "Demam",
    symptoms: "Demam",
    treatment: "Konsultasi",
    prescription: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 2 }],
    createdAt: "2026-07-07T00:00:00.000Z",
};
const appointment = { id: "appt-1", patientId: "patient-1", serviceIds: ["svc-1", "svc-lab"] };
const service = { id: "svc-1", name: "Konsultasi", category: "Konsultasi", price: 100000 };
const labService = { id: "svc-lab", name: "Darah", category: "Laboratorium", price: 50000 };
const medicine = { id: "med-1", name: "Paracetamol", sellPrice: 12000 };
const insuranceProfile = { id: "ins-1", patientId: "patient-1", provider: "bpjs", rateMultiplier: 0.2 };
// gross = 100000 (svc) + 50000 (lab) + 24000 (obat) = 174000
function mockCollections(overrides = {}) {
    const base = {
        patients: [{ id: "patient-1", name: "Budi" }],
        appointments: [appointment],
        services: [service, labService],
        medicines: [medicine],
        payments: [],
        pharmacyRequests: [],
        insuranceProfiles: [insuranceProfile],
        inpatientAdmissions: [],
        medicalEquipments: [],
        insuranceClaims: [],
        billingRecords: [],
        medicalRecords: [medicalRecord],
        ...overrides,
    };
    mockedCollectionService.list.mockImplementation(async (collection) => (base[collection] ?? []));
}
describe("BillingService coverage mengikuti keputusan klaim", () => {
    beforeEach(() => jest.resetAllMocks());
    it("memakai porsi teoretis rateMultiplier selama belum ada klaim final", async () => {
        mockCollections();
        mockedCollectionService.createItem.mockImplementation(async (_c, payload) => ({ id: "bill-1", ...payload }));
        const billing = await billingService_1.BillingService.syncFromMedicalRecord(medicalRecord);
        // coverage = 174000 * (1 - 0.2) = 139200
        expect(billing.insuranceCoverage).toBe(139200);
        expect(billing.total).toBe(34800);
        expect(billing.status).toBe("claimed_to_insurance");
    });
    it("memakai approvedAmount klaim yang sudah dicairkan dan tidak menghitung dana asuransi sebagai bayaran pasien", async () => {
        mockCollections({
            insuranceClaims: [{ id: "claim-1", medicalRecordId: "mr-1", status: "paid", claimedAmount: 139200, approvedAmount: 120000 }],
            payments: [{ id: "pay-ins", medicalRecordId: "mr-1", amount: 120000, paymentSource: "insurance" }],
        });
        mockedCollectionService.createItem.mockImplementation(async (_c, payload) => ({ id: "bill-1", ...payload }));
        const billing = await billingService_1.BillingService.syncFromMedicalRecord(medicalRecord);
        expect(billing.insuranceCoverage).toBe(120000);
        expect(billing.insurancePaidAmount).toBe(120000);
        // sisa tanggungan pasien = 174000 - 120000 = 54000, belum dibayar pasien
        expect(billing.total).toBe(54000);
        expect(billing.paidAmount).toBe(0);
        expect(billing.status).toBe("waiting_payment");
    });
    it("menjadikan seluruh tagihan tanggungan pasien saat klaim ditolak", async () => {
        mockCollections({
            insuranceClaims: [{ id: "claim-1", medicalRecordId: "mr-1", status: "rejected", claimedAmount: 139200, approvedAmount: 0 }],
        });
        mockedCollectionService.createItem.mockImplementation(async (_c, payload) => ({ id: "bill-1", ...payload }));
        const billing = await billingService_1.BillingService.syncFromMedicalRecord(medicalRecord);
        expect(billing.insuranceCoverage).toBe(0);
        expect(billing.total).toBe(174000);
        expect(billing.status).toBe("waiting_payment");
    });
});
describe("InsuranceService.transitionClaim", () => {
    beforeEach(() => jest.resetAllMocks());
    it("menolak transisi yang tidak diizinkan", async () => {
        mockedCollectionService.findById.mockResolvedValue({ id: "claim-1", status: "draft", medicalRecordId: "mr-1" });
        await expect(insuranceService_1.InsuranceService.transitionClaim("claim-1", "paid")).rejects.toMatchObject({ statusCode: 409 });
    });
    it("mencairkan klaim: membuat pembayaran asuransi dan menautkannya", async () => {
        const disbursementSpy = jest
            .spyOn(billingService_1.BillingService, "recordInsuranceDisbursement")
            .mockResolvedValue({ id: "pay-ins-1" });
        mockedCollectionService.findById.mockResolvedValue({
            id: "claim-1",
            status: "approved",
            medicalRecordId: "mr-1",
            patientId: "patient-1",
            provider: "bpjs",
            approvedAmount: 120000,
        });
        mockedCollectionService.updateItem.mockImplementation(async (_c, id, payload) => ({ id, ...payload }));
        const result = await insuranceService_1.InsuranceService.transitionClaim("claim-1", "paid");
        expect(disbursementSpy).toHaveBeenCalledWith(expect.objectContaining({ medicalRecordId: "mr-1", amount: 120000, method: "bpjs", insuranceClaimId: "claim-1" }));
        expect(result.paymentId).toBe("pay-ins-1");
        disbursementSpy.mockRestore();
    });
});
//# sourceMappingURL=insuranceClaimService.test.js.map