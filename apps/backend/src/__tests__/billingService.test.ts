import { BillingService } from "../services/billingService"
import { CollectionService } from "../services/collectionService"

jest.mock("../services/collectionService")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>

const medicalRecord = {
  id: "mr-1",
  patientId: "patient-1",
  appointmentId: "appt-1",
  doctorId: "doctor-1",
  doctorName: "Dr. Klinik",
  date: "2026-07-07",
  diagnosis: "Demam",
  symptoms: "Demam",
  treatment: "Konsultasi",
  prescription: [{ medicineId: "med-1", medicineName: "Paracetamol", dosage: "500mg", frequency: "3x1", duration: "3 hari", quantity: 2 }],
  createdAt: "2026-07-07T00:00:00.000Z",
} as any

const appointment = {
  id: "appt-1",
  patientId: "patient-1",
  patientName: "Budi",
  serviceId: "svc-1",
  serviceIds: ["svc-1", "svc-lab"],
  createdAt: "2026-07-07T00:00:00.000Z",
} as any

const service = {
  id: "svc-1",
  name: "Konsultasi",
  category: "Konsultasi",
  price: 100000,
} as any

const labService = {
  id: "svc-lab",
  name: "Darah Lengkap",
  category: "Laboratorium",
  price: 50000,
} as any

const medicine = {
  id: "med-1",
  name: "Paracetamol",
  price: 10000,
  sellPrice: 12000,
} as any

function mockBillingCollections(payments: any[] = [], existingBillings: any[] = []) {
  mockedCollectionService.list.mockImplementation(async (collection: any) => {
    if (collection === "patients") return [{ id: "patient-1", name: "Budi" }] as any
    if (collection === "appointments") return [appointment] as any
    if (collection === "services") return [service, labService] as any
    if (collection === "medicines") return [medicine] as any
    if (collection === "payments") return payments as any
    if (collection === "insuranceProfiles") return [] as any
    if (collection === "billingRecords") return existingBillings as any
    if (collection === "medicalRecords") return [medicalRecord] as any
    return [] as any
  })
}

describe("BillingService.recordPayment", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedCollectionService.findById.mockImplementation(async (collection: any, id: string) => {
      if (collection === "medicalRecords" && id === medicalRecord.id) return medicalRecord
      return null
    })
  })

  it("mencatat pembayaran hanya sebesar sisa tagihan saat nominal diterima lebih besar", async () => {
    mockBillingCollections([{ id: "pay-old", medicalRecordId: "mr-1", amount: 25000 }])
    mockedCollectionService.createItem.mockImplementation(async (collection: any, payload: any) => {
      if (collection === "billingRecords") return { id: "bill-1", ...payload } as any
      if (collection === "payments") return { id: "pay-1", ...payload } as any
      return { id: "item-1", ...payload } as any
    })
    mockedCollectionService.updateItem.mockResolvedValue({ id: "bill-1" } as any)

    const payment = await BillingService.recordPayment({
      patientId: "patient-1",
      medicalRecordId: "mr-1",
      amount: 200000,
      method: "tunai",
      paidAt: "2026-07-07T01:00:00.000Z",
    })

    expect(payment.amount).toBe(149000)
    expect(mockedCollectionService.createItem).toHaveBeenCalledWith(
      "billingRecords",
      expect.objectContaining({
        serviceCost: 100000,
        medicineCost: 24000,
        labCost: 50000,
        total: 174000,
        paidAmount: 25000,
      }),
    )
    expect(mockedCollectionService.createItem).toHaveBeenCalledWith(
      "payments",
      expect.objectContaining({
        patientId: "patient-1",
        medicalRecordId: "mr-1",
        amount: 149000,
      }),
    )
  })

  it("menolak pembayaran jika pasien tidak sesuai dengan rekam medis", async () => {
    mockBillingCollections()

    await expect(
      BillingService.recordPayment({
        patientId: "patient-lain",
        medicalRecordId: "mr-1",
        amount: 10000,
        method: "tunai",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Pasien pembayaran tidak sesuai dengan rekam medis.",
    })
  })

  it("menolak pembayaran untuk tagihan yang sudah lunas", async () => {
    mockBillingCollections([{ id: "pay-old", medicalRecordId: "mr-1", amount: 174000 }])
    mockedCollectionService.createItem.mockImplementation(async (collection: any, payload: any) => {
      if (collection === "billingRecords") return { id: "bill-1", ...payload } as any
      return { id: "item-1", ...payload } as any
    })

    await expect(
      BillingService.recordPayment({
        patientId: "patient-1",
        medicalRecordId: "mr-1",
        amount: 10000,
        method: "tunai",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Tagihan sudah lunas.",
    })
  })
})

describe("BillingService.updatePayment", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedCollectionService.findById.mockImplementation(async (collection: any, id: string) => {
      if (collection === "payments" && id === "pay-1") {
        return {
          id: "pay-1",
          patientId: "patient-1",
          medicalRecordId: "mr-1",
          amount: 25000,
          method: "tunai",
          paidAt: "2026-07-07T01:00:00.000Z",
          createdAt: "2026-07-07T01:00:00.000Z",
        } as any
      }
      if (collection === "medicalRecords" && id === medicalRecord.id) return medicalRecord
      return null
    })
  })

  it("membatasi nominal update pembayaran sampai sisa slot tagihan", async () => {
    mockBillingCollections([{ id: "pay-1", medicalRecordId: "mr-1", amount: 25000 }])
    mockedCollectionService.createItem.mockImplementation(async (collection: any, payload: any) => {
      if (collection === "billingRecords") return { id: "bill-1", ...payload } as any
      return { id: "item-1", ...payload } as any
    })
    mockedCollectionService.updateItem.mockImplementation(async (collection: any, id: string, payload: any) => {
      if (collection === "payments") return { id, ...payload } as any
      return { id, ...payload } as any
    })

    const updated = await BillingService.updatePayment("pay-1", {
      amount: 150000,
    })

    expect(updated?.amount).toBe(150000)
    expect(mockedCollectionService.updateItem).toHaveBeenCalledWith(
      "payments",
      "pay-1",
      expect.objectContaining({
        amount: 150000,
        patientId: "patient-1",
        medicalRecordId: "mr-1",
      }),
    )
  })
})
