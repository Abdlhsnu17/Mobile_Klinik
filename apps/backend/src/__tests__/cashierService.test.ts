import { CashierService } from "../services/cashierService"
import { ReportService } from "../services/reportService"
import { CollectionService } from "../services/collectionService"

jest.mock("../services/collectionService")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>

function mockData(payments: unknown[], expenses: unknown[]) {
  mockedCollectionService.list.mockImplementation(async (collection: string) => {
    if (collection === "payments") return payments as any
    if (collection === "expenses") return expenses as any
    return [] as any
  })
}

describe("CashierService", () => {
  beforeEach(() => jest.resetAllMocks())

  it("menghitung ringkasan tunai masuk, non-tunai, dan tunai keluar untuk satu tanggal", async () => {
    mockData(
      [
        { amount: 100000, method: "tunai", paidAt: "2026-07-22T09:00:00.000Z" },
        { amount: 50000, method: "qris", paidAt: "2026-07-22T10:00:00.000Z" },
        { amount: 20000, method: "tunai", paidAt: "2026-07-21T10:00:00.000Z" },
        // Pencairan asuransi tidak boleh dihitung sebagai kas kasir.
        { amount: 500000, method: "bpjs", paymentSource: "insurance", paidAt: "2026-07-22T11:00:00.000Z" },
      ],
      [{ amount: 30000, paymentMethod: "tunai", date: "2026-07-22" }],
    )

    const summary = await CashierService.getDailySummary("2026-07-22")
    expect(summary.systemCashTotal).toBe(100000)
    expect(summary.nonCashTotal).toBe(50000)
    expect(summary.cashExpenseTotal).toBe(30000)
    expect(summary.transactionCount).toBe(2)
  })

  it("menghitung selisih tutup kas (kas fisik vs seharusnya)", async () => {
    mockData(
      [{ amount: 100000, method: "tunai", paidAt: "2026-07-22T09:00:00.000Z" }],
      [{ amount: 30000, paymentMethod: "tunai", date: "2026-07-22" }],
    )
    mockedCollectionService.createItem.mockImplementation(async (_c: string, item: any) => ({ id: "c1", createdAt: "x", ...item }))

    // expected = opening(50000) + cashIn(100000) - cashOut(30000) = 120000; counted 115000 -> selisih -5000
    const closing = await CashierService.closeShift({
      closingDate: "2026-07-22",
      cashierName: "Kasir A",
      openingBalance: 50000,
      countedCashTotal: 115000,
    })

    expect(closing.expectedCashTotal).toBe(120000)
    expect(closing.difference).toBe(-5000)
  })
})

describe("ReportService.getProfitLoss", () => {
  beforeEach(() => jest.resetAllMocks())

  it("menghitung laba bersih dan rincian pengeluaran per kategori dalam rentang", async () => {
    mockedCollectionService.list.mockImplementation(async (collection: string) => {
      if (collection === "payments") {
        return [
          { amount: 500000, paidAt: "2026-07-10T00:00:00.000Z" },
          { amount: 300000, paidAt: "2026-08-10T00:00:00.000Z" }, // di luar rentang
        ] as any
      }
      if (collection === "expenses") {
        return [
          { amount: 100000, category: "gaji", date: "2026-07-05" },
          { amount: 50000, category: "utilitas", date: "2026-07-20" },
          { amount: 999999, category: "gaji", date: "2026-08-01" }, // di luar rentang
        ] as any
      }
      return [] as any
    })

    const result = await ReportService.getProfitLoss({ from: "2026-07-01", to: "2026-07-31" })
    expect(result.totalRevenue).toBe(500000)
    expect(result.totalExpenses).toBe(150000)
    expect(result.netProfit).toBe(350000)
    expect(result.expensesByCategory).toContainEqual({ category: "gaji", total: 100000 })
    expect(result.expensesByCategory).toContainEqual({ category: "utilitas", total: 50000 })
  })
})
