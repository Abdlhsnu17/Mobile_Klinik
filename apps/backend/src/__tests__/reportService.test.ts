import { ReportService } from "../services/reportService"
import { CollectionService } from "../services/collectionService"

jest.mock("../services/collectionService")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>

describe("ReportService", () => {
  describe("getMorbidity", () => {
    it("menghitung jumlah diagnosis terbanyak", async () => {
      mockedCollectionService.list.mockResolvedValue([
        { diagnosis: "ISPA" },
        { diagnosis: "ISPA" },
        { diagnosis: "Demam" },
      ] as any)

      const result = await ReportService.getMorbidity(10)
      expect(result[0]).toEqual({ diagnosis: "ISPA", occurrences: 2 })
      expect(result[1]).toEqual({ diagnosis: "Demam", occurrences: 1 })
    })

    it("menggunakan label default jika diagnosis kosong", async () => {
      mockedCollectionService.list.mockResolvedValue([{ diagnosis: "" }] as any)
      const result = await ReportService.getMorbidity(10)
      expect(result[0].diagnosis).toBe("Belum terdiagnosis")
    })
  })

  describe("getFinancials", () => {
    beforeEach(() => {
      jest.resetAllMocks()
    })

    it("menghitung total pendapatan dari semua pembayaran", async () => {
      mockedCollectionService.list.mockImplementation(async (collection: string) => {
        if (collection === "payments") return [{ amount: 100000 }, { amount: 50000 }] as any
        return [] as any
      })

      const result = await ReportService.getFinancials()
      expect(result.totalRevenue).toBe(150000)
    })

    it("menghitung cicilan per rekam medis dan membagi pendapatan layanan sesuai harga", async () => {
      mockedCollectionService.list.mockImplementation(async (collection: string) => {
        if (collection === "payments") {
          return [
            { medicalRecordId: "mr-1", amount: 60000, method: "tunai" },
            { medicalRecordId: "mr-1", amount: 90000, method: "qris" },
          ] as any
        }
        if (collection === "medicalRecords") return [{ id: "mr-1", appointmentId: "appt-1" }] as any
        if (collection === "appointments") {
          return [{ id: "appt-1", doctorId: "doc-1", serviceIds: ["svc-1", "svc-2"] }] as any
        }
        if (collection === "doctors") return [{ id: "doc-1", name: "Dr. Klinik" }] as any
        if (collection === "services") {
          return [
            { id: "svc-1", name: "Konsultasi", price: 100000 },
            { id: "svc-2", name: "Laboratorium", price: 50000 },
          ] as any
        }
        return [] as any
      })

      const result = await ReportService.getFinancials()

      expect(result.byDoctor).toEqual([{ doctorId: "doc-1", doctorName: "Dr. Klinik", revenue: 150000 }])
      expect(result.byService).toEqual([
        { serviceId: "svc-1", serviceName: "Konsultasi", revenue: 100000 },
        { serviceId: "svc-2", serviceName: "Laboratorium", revenue: 50000 },
      ])
      expect(result.byMethod).toEqual([
        { method: "tunai", revenue: 60000 },
        { method: "qris", revenue: 90000 },
      ])
    })
  })
})
