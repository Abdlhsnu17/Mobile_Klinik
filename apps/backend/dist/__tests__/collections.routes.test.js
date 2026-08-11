"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const collectionService_1 = require("../services/collectionService");
const auth_1 = require("../middlewares/auth");
const appConfig_1 = require("../config/appConfig");
jest.mock("../services/collectionService");
jest.mock("../services/pharmacyService", () => ({
    PharmacyService: { createFromMedicalRecord: jest.fn() },
}));
const mockedCollectionService = collectionService_1.CollectionService;
const authHeader = `Bearer ${(0, auth_1.signAuthToken)({ id: "1", username: "admin", role: "admin" })}`;
const authCookie = `${appConfig_1.AUTH_COOKIE_NAME}=${(0, auth_1.signAuthToken)({ id: "1", username: "admin", role: "admin" })}`;
const patientAuthHeader = `Bearer ${(0, auth_1.signAuthToken)({ id: "2", username: "pasien", role: "umum" })}`;
describe("Collections routes (patients)", () => {
    const app = (0, index_1.createApp)();
    it("GET /api/patients mengembalikan list pasien", async () => {
        mockedCollectionService.list.mockResolvedValue([{ id: "1", name: "Budi" }]);
        const res = await (0, supertest_1.default)(app).get("/api/patients").set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });
    it("menerima token dari cookie HttpOnly", async () => {
        mockedCollectionService.list.mockResolvedValue([{ id: "1", name: "Budi" }]);
        const res = await (0, supertest_1.default)(app).get("/api/patients").set("Cookie", authCookie);
        expect(res.status).toBe(200);
    });
    it("GET /api/patients/:id mengembalikan 404 jika tidak ditemukan", async () => {
        mockedCollectionService.findById.mockResolvedValue(null);
        const res = await (0, supertest_1.default)(app).get("/api/patients/unknown").set("Authorization", authHeader);
        expect(res.status).toBe(404);
    });
    it("menolak request tanpa token", async () => {
        const res = await (0, supertest_1.default)(app).get("/api/patients");
        expect(res.status).toBe(401);
    });
    it("menolak role umum pada endpoint laporan (admin-only)", async () => {
        const reportsRes = await (0, supertest_1.default)(app).get("/api/reports/keuangan").set("Authorization", patientAuthHeader);
        expect(reportsRes.status).toBe(403);
    });
    it("POST /api/patients menolak body tanpa field wajib", async () => {
        const res = await (0, supertest_1.default)(app).post("/api/patients").set("Authorization", authHeader).send({ name: "Budi" });
        expect(res.status).toBe(400);
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
    });
    it("POST /api/patients berhasil membuat pasien dengan data lengkap", async () => {
        const payload = {
            noRM: "RM001",
            nik: "1234567890123456",
            name: "Budi",
            birthDate: "1990-01-01",
            gender: "Laki-laki",
            address: "Jl. Sudirman",
            phone: "08123456789",
        };
        mockedCollectionService.createItem.mockResolvedValue({ id: "1", ...payload });
        const res = await (0, supertest_1.default)(app).post("/api/patients").set("Authorization", authHeader).send(payload);
        expect(res.status).toBe(201);
        expect(mockedCollectionService.createItem).toHaveBeenCalledWith("patients", payload);
    });
    it("PUT /api/patients/:id menolak body kosong", async () => {
        const res = await (0, supertest_1.default)(app).put("/api/patients/1").set("Authorization", authHeader).send({});
        expect(res.status).toBe(400);
    });
    it("DELETE /api/patients/:id mengembalikan 404 jika tidak ditemukan", async () => {
        mockedCollectionService.deleteItem.mockResolvedValue(false);
        const res = await (0, supertest_1.default)(app).delete("/api/patients/unknown").set("Authorization", authHeader);
        expect(res.status).toBe(404);
    });
});
describe("Collections routes (medical-codes / ICD)", () => {
    const app = (0, index_1.createApp)();
    it("GET /api/medical-codes mengembalikan daftar kode untuk staf klinis", async () => {
        mockedCollectionService.list.mockResolvedValue([
            { id: "1", system: "icd10", code: "J06.9", name: "ISPA", isActive: true },
        ]);
        const res = await (0, supertest_1.default)(app).get("/api/medical-codes").set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });
    it("POST /api/medical-codes menolak body tanpa field wajib", async () => {
        const res = await (0, supertest_1.default)(app).post("/api/medical-codes").set("Authorization", authHeader).send({ system: "icd10" });
        expect(res.status).toBe(400);
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
    });
    it("POST /api/medical-codes menolak system tidak valid", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/api/medical-codes")
            .set("Authorization", authHeader)
            .send({ system: "icd11", code: "X", name: "Test" });
        expect(res.status).toBe(400);
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
    });
    it("POST /api/medical-codes berhasil dengan data lengkap", async () => {
        const payload = { system: "icd10", code: "I10", name: "Hipertensi esensial", category: "Sistem Sirkulasi" };
        mockedCollectionService.createItem.mockResolvedValue({ id: "1", ...payload });
        const res = await (0, supertest_1.default)(app).post("/api/medical-codes").set("Authorization", authHeader).send(payload);
        expect(res.status).toBe(201);
        expect(mockedCollectionService.createItem).toHaveBeenCalledWith("medicalCodes", payload);
    });
    it("POST /api/medical-codes menolak role umum (write admin-only)", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/api/medical-codes")
            .set("Authorization", patientAuthHeader)
            .send({ system: "icd10", code: "I10", name: "Hipertensi esensial" });
        expect(res.status).toBe(403);
        expect(mockedCollectionService.createItem).not.toHaveBeenCalled();
    });
});
describe("Collections routes (generic collection without specific schema)", () => {
    const app = (0, index_1.createApp)();
    it("POST /api/clinic-settings menolak body kosong", async () => {
        const res = await (0, supertest_1.default)(app).post("/api/clinic-settings").set("Authorization", authHeader).send({});
        expect(res.status).toBe(400);
    });
    it("POST /api/clinic-settings menerima body yang berisi data", async () => {
        const payload = {
            name: "Klinik A",
            address: "Jl. Sudirman No. 1",
            phone: "0211234567",
            email: "klinik@example.com",
            operationalHours: "08:00 - 20:00",
        };
        mockedCollectionService.createItem.mockResolvedValue({ id: "1", ...payload });
        const res = await (0, supertest_1.default)(app)
            .post("/api/clinic-settings")
            .set("Authorization", authHeader)
            .send(payload);
        expect(res.status).toBe(201);
    });
});
//# sourceMappingURL=collections.routes.test.js.map