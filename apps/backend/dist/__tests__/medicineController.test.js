"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const medicine_service_1 = require("../modules/medicine/medicine.service");
const auth_1 = require("../middlewares/auth");
jest.mock("../modules/medicine/medicine.service");
const mockedMedicineService = medicine_service_1.medicineService;
const authHeader = `Bearer ${(0, auth_1.signAuthToken)({ id: "1", username: "admin", role: "admin" })}`;
describe("GET /api/medicines/stock-movements", () => {
    const app = (0, index_1.createApp)();
    it("mengembalikan daftar pergerakan stok", async () => {
        mockedMedicineService.getStockMovements.mockResolvedValue([
            { id: "1", medicineId: "med-1", type: "in", quantity: 10, createdAt: new Date().toISOString() },
        ]);
        const res = await (0, supertest_1.default)(app).get("/api/medicines/stock-movements").set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(mockedMedicineService.getStockMovements).toHaveBeenCalledWith(undefined, undefined);
    });
    it("meneruskan query limit sebagai angka", async () => {
        mockedMedicineService.getStockMovements.mockResolvedValue([]);
        const res = await (0, supertest_1.default)(app)
            .get("/api/medicines/stock-movements")
            .query({ limit: "5" })
            .set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(mockedMedicineService.getStockMovements).toHaveBeenCalledWith(5, undefined);
    });
    it("menolak request tanpa token", async () => {
        const res = await (0, supertest_1.default)(app).get("/api/medicines/stock-movements");
        expect(res.status).toBe(401);
    });
});
//# sourceMappingURL=medicineController.test.js.map