import { medicineRepository } from "../modules/medicine/medicine.repository"
import { medicineService } from "../modules/medicine/medicine.service"
import { BillingService } from "../services/billingService"
import { CollectionService } from "../services/collectionService"
import { PharmacyService } from "../services/pharmacyService"

jest.mock("../modules/medicine/medicine.repository")
jest.mock("../modules/medicine/medicine.service")
jest.mock("../services/collectionService")
jest.mock("../services/billingService")

const mockedMedicineRepository = medicineRepository as jest.Mocked<typeof medicineRepository>
const mockedMedicineService = medicineService as jest.Mocked<typeof medicineService>
const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>
const mockedBillingService = BillingService as jest.Mocked<typeof BillingService>

describe("PharmacyService.updateStatus", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedBillingService.syncByRecordId.mockResolvedValue(undefined as any)
  })

  // Pengurangan stok sendiri (termasuk urutan FEFO) diuji di medicineService.fefo.test.ts;
  // di sini yang dijaga adalah PharmacyService mendelegasikannya dengan benar.
  it("mengurangi stok lewat alur FEFO saat dispensing", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "req-1",
      medicalRecordId: "mr-1",
      patientName: "Budi",
      status: "verified",
      items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 2 }],
    } as any)
    mockedMedicineRepository.findById.mockResolvedValue({
      id: "med-1",
      name: "Paracetamol",
      stock: 10,
    } as any)
    mockedMedicineService.consumeStockFefo.mockResolvedValue([
      { batchId: "batch-1", batchNumber: "B1", quantity: 2 },
    ])
    mockedCollectionService.updateItem.mockResolvedValue({ id: "req-1", status: "dispensed" } as any)

    await PharmacyService.updateStatus("req-1", "dispensed")

    expect(mockedMedicineService.consumeStockFefo).toHaveBeenCalledWith(
      expect.objectContaining({ medicineId: "med-1", quantity: 2, referenceId: "req-1" }),
    )
  })

  it("membatalkan dispensing bila pengurangan stok ditolak", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "req-1",
      medicalRecordId: "mr-1",
      patientName: "Budi",
      status: "verified",
      items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 5 }],
    } as any)
    mockedMedicineRepository.findById.mockResolvedValue({
      id: "med-1",
      name: "Paracetamol",
      stock: 2,
    } as any)
    mockedMedicineService.consumeStockFefo.mockRejectedValue(
      Object.assign(new Error("Stok Paracetamol tidak cukup."), { statusCode: 409 }),
    )

    await expect(PharmacyService.updateStatus("req-1", "dispensed")).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
  })

  it("menolak perubahan status bila permintaan sudah final", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "req-1",
      medicalRecordId: "mr-1",
      status: "fulfilled",
    } as any)

    await expect(PharmacyService.updateStatus("req-1", "verified")).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
  })

  it("mengembalikan stok ke batch asalnya saat status dibatalkan dari dispensed", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "req-1",
      medicalRecordId: "mr-1",
      patientName: "Budi",
      status: "dispensed",
      items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 3 }],
    } as any)
    mockedMedicineRepository.findDispenseAllocations.mockResolvedValue([
      { medicineId: "med-1", batchId: "batch-1", quantity: 1 },
      { medicineId: "med-1", batchId: "batch-2", quantity: 2 },
    ])
    mockedCollectionService.updateItem.mockResolvedValue({ id: "req-1", status: "cancelled" } as any)

    await PharmacyService.updateStatus("req-1", "cancelled")

    expect(mockedMedicineService.returnStockToBatches).toHaveBeenCalledWith(
      expect.objectContaining({
        medicineId: "med-1",
        entries: [
          { batchId: "batch-1", quantity: 1 },
          { batchId: "batch-2", quantity: 2 },
        ],
        referenceId: "req-1",
      }),
    )
  })

  it("mengembalikan stok berdasarkan item resep bila penyerahan lama tak punya jejak alokasi batch", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "req-1",
      medicalRecordId: "mr-1",
      patientName: "Budi",
      status: "dispensed",
      items: [{ medicineId: "med-1", medicineName: "Paracetamol", quantity: 3 }],
    } as any)
    mockedMedicineRepository.findDispenseAllocations.mockResolvedValue([])
    mockedMedicineRepository.findById.mockResolvedValue({
      id: "med-1",
      name: "Paracetamol",
      stock: 5,
    } as any)
    mockedCollectionService.updateItem.mockResolvedValue({ id: "req-1", status: "cancelled" } as any)

    await PharmacyService.updateStatus("req-1", "cancelled")

    expect(mockedMedicineService.returnStockToBatches).toHaveBeenCalledWith(
      expect.objectContaining({
        medicineId: "med-1",
        entries: [{ batchId: null, quantity: 3 }],
      }),
    )
  })
})
