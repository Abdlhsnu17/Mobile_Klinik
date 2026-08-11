import { ProcurementService } from "../services/procurementService"
import { CollectionService } from "../services/collectionService"
import { medicineService } from "../modules/medicine/medicine.service"

jest.mock("../services/collectionService")
jest.mock("../modules/medicine/medicine.service")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>
const mockedMedicineService = medicineService as jest.Mocked<typeof medicineService>

const basePo = {
  id: "po1",
  poNumber: "PO-1",
  supplierId: "s1",
  supplierName: "PT Sehat",
  status: "dipesan" as const,
  orderDate: "2026-07-01",
  items: [
    { medicineId: "m1", medicineName: "Paracetamol", quantity: 100, unitPrice: 500, receivedQuantity: 0 },
    { medicineId: "m2", medicineName: "Amoxicillin", quantity: 50, unitPrice: 800, receivedQuantity: 0 },
  ],
  totalAmount: 90000,
  createdAt: "2026-07-01T00:00:00.000Z",
}

describe("ProcurementService.receivePurchaseOrder", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedMedicineService.receiveBatch.mockResolvedValue({} as any)
    mockedCollectionService.updateItem.mockImplementation(async (_c: string, _id: string, patch: any) => ({ ...basePo, ...patch }))
  })

  it("menambah stok via receiveBatch dan menandai status selesai bila semua diterima penuh", async () => {
    mockedCollectionService.findById.mockResolvedValue(structuredClone(basePo) as any)

    const result = await ProcurementService.receivePurchaseOrder("po1", [
      { medicineId: "m1", receivedQuantity: 100, batchNumber: "B1", expiryDate: "2027-01-01" },
      { medicineId: "m2", receivedQuantity: 50, batchNumber: "B2", expiryDate: "2027-01-01" },
    ])

    expect(mockedMedicineService.receiveBatch).toHaveBeenCalledTimes(2)
    expect(mockedMedicineService.receiveBatch).toHaveBeenCalledWith(
      expect.objectContaining({ medicineId: "m1", quantity: 100, batchNumber: "B1", supplier: "PT Sehat" }),
    )
    expect(result.status).toBe("selesai")
  })

  it("menandai status diterima-sebagian bila hanya sebagian diterima", async () => {
    mockedCollectionService.findById.mockResolvedValue(structuredClone(basePo) as any)

    const result = await ProcurementService.receivePurchaseOrder("po1", [
      { medicineId: "m1", receivedQuantity: 40, batchNumber: "B1", expiryDate: "2027-01-01" },
    ])

    expect(result.status).toBe("diterima-sebagian")
    const savedItems = mockedCollectionService.updateItem.mock.calls[0][2].items
    expect(savedItems.find((i: any) => i.medicineId === "m1").receivedQuantity).toBe(40)
  })

  it("menolak jumlah terima melebihi sisa pesanan", async () => {
    mockedCollectionService.findById.mockResolvedValue(structuredClone(basePo) as any)
    await expect(
      ProcurementService.receivePurchaseOrder("po1", [
        { medicineId: "m1", receivedQuantity: 200, batchNumber: "B1", expiryDate: "2027-01-01" },
      ]),
    ).rejects.toMatchObject({ statusCode: 422 })
    expect(mockedMedicineService.receiveBatch).not.toHaveBeenCalled()
  })

  it("menolak bila PO tidak ditemukan", async () => {
    mockedCollectionService.findById.mockResolvedValue(null)
    await expect(
      ProcurementService.receivePurchaseOrder("x", [{ medicineId: "m1", receivedQuantity: 1, batchNumber: "B", expiryDate: "2027-01-01" }]),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it("menolak menerima PO yang sudah selesai", async () => {
    mockedCollectionService.findById.mockResolvedValue({ ...structuredClone(basePo), status: "selesai" } as any)
    await expect(
      ProcurementService.receivePurchaseOrder("po1", [{ medicineId: "m1", receivedQuantity: 1, batchNumber: "B", expiryDate: "2027-01-01" }]),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it("menolak baris tanpa nomor batch / kedaluwarsa", async () => {
    mockedCollectionService.findById.mockResolvedValue(structuredClone(basePo) as any)
    await expect(
      ProcurementService.receivePurchaseOrder("po1", [
        { medicineId: "m1", receivedQuantity: 10, batchNumber: "", expiryDate: "" },
      ]),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})
