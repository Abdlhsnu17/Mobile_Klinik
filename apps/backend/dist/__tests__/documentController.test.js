"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const documentService_1 = require("../services/documentService");
const auth_1 = require("../middlewares/auth");
jest.mock("../services/documentService");
jest.mock("fs/promises", () => ({
    access: jest.fn(),
    unlink: jest.fn(),
}));
const mockedDocumentService = documentService_1.DocumentService;
const authHeader = `Bearer ${(0, auth_1.signAuthToken)({ id: "1", username: "admin", role: "admin" })}`;
const nonPrivilegedHeader = `Bearer ${(0, auth_1.signAuthToken)({ id: "2", username: "dokter", role: "dokter" })}`;
describe("Documents routes", () => {
    const app = (0, index_1.createApp)();
    const sampleDocument = {
        id: "doc-1",
        title: "Laporan Barang Masuk",
        category: "laporan-barang-masuk",
        filename: "1-abc.pdf",
        originalName: "laporan.pdf",
        mimeType: "application/pdf",
        size: 1024,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    it("GET /api/documents mengembalikan list dokumen", async () => {
        mockedDocumentService.list.mockResolvedValue([sampleDocument]);
        const res = await (0, supertest_1.default)(app).get("/api/documents").set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });
    it("GET /api/documents memfilter berdasarkan category", async () => {
        mockedDocumentService.list.mockResolvedValue([
            sampleDocument,
            { ...sampleDocument, id: "doc-2", category: "lainnya" },
        ]);
        const res = await (0, supertest_1.default)(app)
            .get("/api/documents")
            .query({ category: "laporan-barang-masuk" })
            .set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].id).toBe("doc-1");
    });
    it("menolak role yang tidak diizinkan membaca dokumen", async () => {
        const res = await (0, supertest_1.default)(app).get("/api/documents").set("Authorization", nonPrivilegedHeader);
        expect(res.status).toBe(403);
    });
    it("GET /api/documents/:id mengembalikan 404 jika tidak ditemukan", async () => {
        mockedDocumentService.findById.mockResolvedValue(null);
        const res = await (0, supertest_1.default)(app).get("/api/documents/unknown").set("Authorization", authHeader);
        expect(res.status).toBe(404);
    });
    it("GET /api/documents/:id mengembalikan metadata dokumen", async () => {
        mockedDocumentService.findById.mockResolvedValue(sampleDocument);
        const res = await (0, supertest_1.default)(app).get("/api/documents/doc-1").set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe("doc-1");
    });
    it("DELETE /api/documents/:id mengembalikan 404 jika tidak ditemukan", async () => {
        mockedDocumentService.delete.mockResolvedValue(false);
        const res = await (0, supertest_1.default)(app).delete("/api/documents/unknown").set("Authorization", authHeader);
        expect(res.status).toBe(404);
    });
    it("DELETE /api/documents/:id berhasil menghapus dokumen", async () => {
        mockedDocumentService.delete.mockResolvedValue(true);
        const res = await (0, supertest_1.default)(app).delete("/api/documents/doc-1").set("Authorization", authHeader);
        expect(res.status).toBe(204);
    });
    it("menolak role umum menghapus dokumen (admin-only)", async () => {
        const res = await (0, supertest_1.default)(app).delete("/api/documents/doc-1").set("Authorization", nonPrivilegedHeader);
        expect(res.status).toBe(403);
    });
});
//# sourceMappingURL=documentController.test.js.map