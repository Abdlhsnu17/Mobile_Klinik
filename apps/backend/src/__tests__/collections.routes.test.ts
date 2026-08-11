import request from "supertest"
import { createApp } from "../index"
import { CollectionService } from "../services/collectionService"
import { signAuthToken } from "../middlewares/auth"
import { AUTH_COOKIE_NAME } from "../config/appConfig"

jest.mock("../services/collectionService")
jest.mock("../services/pharmacyService", () => ({
  PharmacyService: { createFromMedicalRecord: jest.fn() },
}))

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>
const authHeader = `Bearer ${signAuthToken({ id: "1", username: "admin", role: "admin" })}`
const authCookie = `${AUTH_COOKIE_NAME}=${signAuthToken({ id: "1", username: "admin", role: "admin" })}`
const patientAuthHeader = `Bearer ${signAuthToken({ id: "2", username: "pasien", role: "umum" })}`

describe("Collections routes (patients)", () => {
  const app = createApp()

  it("GET /api/patients mengembalikan list pasien", async () => {
    mockedCollectionService.list.mockResolvedValue([{ id: "1", name: "Budi" }] as any)
    const res = await request(app).get("/api/patients").set("Authorization", authHeader)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it("menerima token dari cookie HttpOnly", async () => {
    mockedCollectionService.list.mockResolvedValue([{ id: "1", name: "Budi" }] as any)
    const res = await request(app).get("/api/patients").set("Cookie", authCookie)
    expect(res.status).toBe(200)
  })

  it("GET /api/patients/:id mengembalikan 404 jika tidak ditemukan", async () => {
    mockedCollectionService.findById.mockResolvedValue(null)
    const res = await request(app).get("/api/patients/unknown").set("Authorization", authHeader)
    expect(res.status).toBe(404)
  })

  it("menolak request tanpa token", async () => {
    const res = await request(app).get("/api/patients")
    expect(res.status).toBe(401)
  })

  it("menolak role umum pada endpoint laporan (admin-only)", async () => {
    const reportsRes = await request(app).get("/api/reports/keuangan").set("Authorization", patientAuthHeader)

    expect(reportsRes.status).toBe(403)
  })

  it("POST /api/patients menolak body tanpa field wajib", async () => {
    const res = await request(app).post("/api/patients").set("Authorization", authHeader).send({ name: "Budi" })
    expect(res.status).toBe(400)
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
  })

  it("POST /api/patients berhasil membuat pasien dengan data lengkap", async () => {
    const payload = {
      noRM: "RM001",
      nik: "1234567890123456",
      name: "Budi",
      birthDate: "1990-01-01",
      gender: "Laki-laki",
      address: "Jl. Sudirman",
      phone: "08123456789",
    }
    mockedCollectionService.createItem.mockResolvedValue({ id: "1", ...payload } as any)
    const res = await request(app).post("/api/patients").set("Authorization", authHeader).send(payload)
    expect(res.status).toBe(201)
    expect(mockedCollectionService.createItem).toHaveBeenCalledWith("patients", payload)
  })

  it("PUT /api/patients/:id menolak body kosong", async () => {
    const res = await request(app).put("/api/patients/1").set("Authorization", authHeader).send({})
    expect(res.status).toBe(400)
  })

  it("DELETE /api/patients/:id mengembalikan 404 jika tidak ditemukan", async () => {
    mockedCollectionService.deleteItem.mockResolvedValue(false)
    const res = await request(app).delete("/api/patients/unknown").set("Authorization", authHeader)
    expect(res.status).toBe(404)
  })
})

describe("Collections routes (medical-codes / ICD)", () => {
  const app = createApp()

  it("GET /api/medical-codes mengembalikan daftar kode untuk staf klinis", async () => {
    mockedCollectionService.list.mockResolvedValue([
      { id: "1", system: "icd10", code: "J06.9", name: "ISPA", isActive: true },
    ] as any)
    const res = await request(app).get("/api/medical-codes").set("Authorization", authHeader)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it("POST /api/medical-codes menolak body tanpa field wajib", async () => {
    const res = await request(app).post("/api/medical-codes").set("Authorization", authHeader).send({ system: "icd10" })
    expect(res.status).toBe(400)
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
  })

  it("POST /api/medical-codes menolak system tidak valid", async () => {
    const res = await request(app)
      .post("/api/medical-codes")
      .set("Authorization", authHeader)
      .send({ system: "icd11", code: "X", name: "Test" })
    expect(res.status).toBe(400)
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
  })

  it("POST /api/medical-codes berhasil dengan data lengkap", async () => {
    const payload = { system: "icd10", code: "I10", name: "Hipertensi esensial", category: "Sistem Sirkulasi" }
    mockedCollectionService.createItem.mockResolvedValue({ id: "1", ...payload } as any)
    const res = await request(app).post("/api/medical-codes").set("Authorization", authHeader).send(payload)
    expect(res.status).toBe(201)
    expect(mockedCollectionService.createItem).toHaveBeenCalledWith("medicalCodes", payload)
  })

  it("POST /api/medical-codes menolak role umum (write admin-only)", async () => {
    const res = await request(app)
      .post("/api/medical-codes")
      .set("Authorization", patientAuthHeader)
      .send({ system: "icd10", code: "I10", name: "Hipertensi esensial" })
    expect(res.status).toBe(403)
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
  })
})

describe("Collections routes (generic collection without specific schema)", () => {
  const app = createApp()

  it("POST /api/clinic-settings menolak body kosong", async () => {
    const res = await request(app).post("/api/clinic-settings").set("Authorization", authHeader).send({})
    expect(res.status).toBe(400)
  })

  it("POST /api/clinic-settings menerima body yang berisi data", async () => {
    const payload = {
      name: "Klinik A",
      address: "Jl. Sudirman No. 1",
      phone: "0211234567",
      email: "klinik@example.com",
      operationalHours: "08:00 - 20:00",
    }
    mockedCollectionService.createItem.mockResolvedValue({ id: "1", ...payload } as any)
    const res = await request(app)
      .post("/api/clinic-settings")
      .set("Authorization", authHeader)
      .send(payload)
    expect(res.status).toBe(201)
  })
})
