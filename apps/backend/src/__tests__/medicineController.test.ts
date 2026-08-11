import request from "supertest"
import { createApp } from "../index"
import { medicineService } from "../modules/medicine/medicine.service"
import { signAuthToken } from "../middlewares/auth"

jest.mock("../modules/medicine/medicine.service")

const mockedMedicineService = medicineService as jest.Mocked<typeof medicineService>
const authHeader = `Bearer ${signAuthToken({ id: "1", username: "admin", role: "admin" })}`

describe("GET /api/medicines/stock-movements", () => {
  const app = createApp()

  it("mengembalikan daftar pergerakan stok", async () => {
    mockedMedicineService.getStockMovements.mockResolvedValue([
      { id: "1", medicineId: "med-1", type: "in", quantity: 10, createdAt: new Date().toISOString() },
    ] as any)

    const res = await request(app).get("/api/medicines/stock-movements").set("Authorization", authHeader)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(mockedMedicineService.getStockMovements).toHaveBeenCalledWith(undefined, undefined)
  })

  it("meneruskan query limit sebagai angka", async () => {
    mockedMedicineService.getStockMovements.mockResolvedValue([])

    const res = await request(app)
      .get("/api/medicines/stock-movements")
      .query({ limit: "5" })
      .set("Authorization", authHeader)

    expect(res.status).toBe(200)
    expect(mockedMedicineService.getStockMovements).toHaveBeenCalledWith(5, undefined)
  })

  it("menolak request tanpa token", async () => {
    const res = await request(app).get("/api/medicines/stock-movements")
    expect(res.status).toBe(401)
  })
})
