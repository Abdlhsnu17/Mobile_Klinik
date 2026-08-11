import request from "supertest"
import { createApp } from "../index"
import { DocumentService } from "../services/documentService"
import { signAuthToken } from "../middlewares/auth"

jest.mock("../services/documentService")
jest.mock("fs/promises", () => ({
  access: jest.fn(),
  unlink: jest.fn(),
}))

const mockedDocumentService = DocumentService as jest.Mocked<typeof DocumentService>
const authHeader = `Bearer ${signAuthToken({ id: "1", username: "admin", role: "admin" })}`
const nonPrivilegedHeader = `Bearer ${signAuthToken({ id: "2", username: "dokter", role: "dokter" })}`

describe("Documents routes", () => {
  const app = createApp()

  const sampleDocument = {
    id: "doc-1",
    title: "Laporan Barang Masuk",
    category: "laporan-barang-masuk" as const,
    filename: "1-abc.pdf",
    originalName: "laporan.pdf",
    mimeType: "application/pdf",
    size: 1024,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it("GET /api/documents mengembalikan list dokumen", async () => {
    mockedDocumentService.list.mockResolvedValue([sampleDocument] as any)
    const res = await request(app).get("/api/documents").set("Authorization", authHeader)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it("GET /api/documents memfilter berdasarkan category", async () => {
    mockedDocumentService.list.mockResolvedValue([
      sampleDocument,
      { ...sampleDocument, id: "doc-2", category: "lainnya" as const },
    ] as any)
    const res = await request(app)
      .get("/api/documents")
      .query({ category: "laporan-barang-masuk" })
      .set("Authorization", authHeader)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe("doc-1")
  })

  it("menolak role yang tidak diizinkan membaca dokumen", async () => {
    const res = await request(app).get("/api/documents").set("Authorization", nonPrivilegedHeader)
    expect(res.status).toBe(403)
  })

  it("GET /api/documents/:id mengembalikan 404 jika tidak ditemukan", async () => {
    mockedDocumentService.findById.mockResolvedValue(null)
    const res = await request(app).get("/api/documents/unknown").set("Authorization", authHeader)
    expect(res.status).toBe(404)
  })

  it("GET /api/documents/:id mengembalikan metadata dokumen", async () => {
    mockedDocumentService.findById.mockResolvedValue(sampleDocument as any)
    const res = await request(app).get("/api/documents/doc-1").set("Authorization", authHeader)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe("doc-1")
  })

  it("DELETE /api/documents/:id mengembalikan 404 jika tidak ditemukan", async () => {
    mockedDocumentService.delete.mockResolvedValue(false)
    const res = await request(app).delete("/api/documents/unknown").set("Authorization", authHeader)
    expect(res.status).toBe(404)
  })

  it("DELETE /api/documents/:id berhasil menghapus dokumen", async () => {
    mockedDocumentService.delete.mockResolvedValue(true)
    const res = await request(app).delete("/api/documents/doc-1").set("Authorization", authHeader)
    expect(res.status).toBe(204)
  })

  it("menolak role umum menghapus dokumen (admin-only)", async () => {
    const res = await request(app).delete("/api/documents/doc-1").set("Authorization", nonPrivilegedHeader)
    expect(res.status).toBe(403)
  })
})
