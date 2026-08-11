import { AlertService } from "../services/alertService"
import { CollectionService } from "../services/collectionService"

jest.mock("../services/collectionService")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function mockData(medicines: unknown[], equipments: unknown[]) {
  mockedCollectionService.list.mockImplementation(async (collection: string) => {
    if (collection === "medicines") return medicines as any
    if (collection === "medicalEquipments") return equipments as any
    return [] as any
  })
}

describe("AlertService.getOperationalAlerts", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("menandai stok habis sebagai kritis dan stok menipis sebagai perhatian", async () => {
    mockData(
      [
        { id: "m1", name: "Paracetamol", unit: "tablet", stock: 0, minStock: 10, expiryDate: daysFromNow(365), isActive: 1 },
        { id: "m2", name: "Amoxicillin", unit: "kapsul", stock: 5, minStock: 10, expiryDate: daysFromNow(365), isActive: 1 },
      ],
      [],
    )

    const result = await AlertService.getOperationalAlerts()
    const lowStock = result.alerts.filter((a) => a.category === "stok-menipis")
    expect(lowStock).toHaveLength(2)
    expect(lowStock.find((a) => a.referenceId === "m1")?.severity).toBe("critical")
    expect(lowStock.find((a) => a.referenceId === "m2")?.severity).toBe("warning")
    expect(result.summary.byCategory["stok-menipis"]).toBe(2)
  })

  it("tidak memunculkan alert stok bila stok di atas minimum", async () => {
    mockData([{ id: "m1", name: "Vitamin C", unit: "tablet", stock: 100, minStock: 10, expiryDate: daysFromNow(365), isActive: 1 }], [])
    const result = await AlertService.getOperationalAlerts()
    expect(result.alerts.filter((a) => a.category === "stok-menipis")).toHaveLength(0)
  })

  it("menandai obat kedaluwarsa (lampau) sebagai kritis dan yang mendekati sebagai perhatian", async () => {
    mockData(
      [
        { id: "m1", name: "Obat Lama", unit: "tablet", stock: 50, minStock: 10, expiryDate: daysFromNow(-3), isActive: 1 },
        { id: "m2", name: "Obat Segera", unit: "tablet", stock: 50, minStock: 10, expiryDate: daysFromNow(10), isActive: 1 },
        { id: "m3", name: "Obat Aman", unit: "tablet", stock: 50, minStock: 10, expiryDate: daysFromNow(200), isActive: 1 },
      ],
      [],
    )

    const result = await AlertService.getOperationalAlerts()
    const expiry = result.alerts.filter((a) => a.category === "obat-kadaluarsa")
    expect(expiry).toHaveLength(2)
    expect(expiry.find((a) => a.referenceId === "m1")?.severity).toBe("critical")
    expect(expiry.find((a) => a.referenceId === "m2")?.severity).toBe("warning")
  })

  it("mengabaikan obat nonaktif", async () => {
    mockData([{ id: "m1", name: "Obat Nonaktif", unit: "tablet", stock: 0, minStock: 10, expiryDate: daysFromNow(-3), isActive: 0 }], [])
    const result = await AlertService.getOperationalAlerts()
    expect(result.summary.total).toBe(0)
  })

  it("menandai maintenance alat yang terlewat dan yang akan jatuh tempo", async () => {
    mockData(
      [],
      [
        { id: "e1", name: "USG", status: "Tersedia", nextMaintenanceDate: daysFromNow(-5) },
        { id: "e2", name: "EKG", status: "Tersedia", nextMaintenanceDate: daysFromNow(7) },
        { id: "e3", name: "Nebulizer", status: "Tersedia", nextMaintenanceDate: daysFromNow(90) },
        { id: "e4", name: "Alat Rusak", status: "Tidak Aktif", nextMaintenanceDate: daysFromNow(-5) },
      ],
    )

    const result = await AlertService.getOperationalAlerts()
    const maintenance = result.alerts.filter((a) => a.category === "maintenance-alat")
    expect(maintenance).toHaveLength(2)
    expect(maintenance.find((a) => a.referenceId === "e1")?.severity).toBe("critical")
    expect(maintenance.find((a) => a.referenceId === "e2")?.severity).toBe("warning")
  })

  it("mengurutkan alert kritis di atas dan menyertakan ringkasan", async () => {
    mockData(
      [
        { id: "m1", name: "Menipis", unit: "tablet", stock: 5, minStock: 10, expiryDate: daysFromNow(365), isActive: 1 },
        { id: "m2", name: "Habis", unit: "tablet", stock: 0, minStock: 10, expiryDate: daysFromNow(365), isActive: 1 },
      ],
      [],
    )
    const result = await AlertService.getOperationalAlerts()
    expect(result.alerts[0].severity).toBe("critical")
    expect(result.summary.total).toBe(2)
    expect(result.summary.critical).toBe(1)
    expect(result.summary.warning).toBe(1)
    expect(result.thresholds.expiryDays).toBe(30)
  })
})
