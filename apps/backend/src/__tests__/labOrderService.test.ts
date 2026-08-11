import { CollectionService } from "../services/collectionService"
import { LabOrderService } from "../services/labOrderService"

jest.mock("../services/collectionService")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>

describe("LabOrderService.syncFromMedicalRecord", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("tidak membuat order lab bila keputusan klinis bukan lab-required", async () => {
    mockedCollectionService.list.mockResolvedValue([] as any)

    const result = await LabOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      clinicalDecision: "prescription",
    } as any)

    expect(result).toBeNull()
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
  })

  it("membatalkan order lab yang masih requested bila keputusan klinis berubah", async () => {
    mockedCollectionService.list.mockResolvedValue([
      { id: "order-1", medicalRecordId: "mr-1", status: "requested" },
    ] as any)
    mockedCollectionService.updateItem.mockResolvedValue({
      id: "order-1",
      status: "cancelled",
    } as any)

    const result = await LabOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      clinicalDecision: "prescription",
    } as any)

    expect(mockedCollectionService.updateItem).toHaveBeenCalledWith(
      "labOrders",
      "order-1",
      expect.objectContaining({ status: "cancelled" }),
    )
    expect(result).toMatchObject({ status: "cancelled" })
  })

  it("membuat order lab baru saat keputusan klinis lab-required", async () => {
    mockedCollectionService.list.mockImplementation(async (collection) => {
      if (collection === "labOrders") return [] as any
      if (collection === "services")
        return [{ id: "svc-1", name: "Darah Lengkap", category: "Laboratorium" }] as any
      return [] as any
    })
    mockedCollectionService.findById.mockImplementation(async (collection, id) => {
      if (collection === "patients") return { id, name: "Budi" } as any
      if (collection === "doctors") return { id, name: "dr. Ani" } as any
      if (collection === "appointments") return { id, serviceIds: ["svc-1"] } as any
      return null
    })
    mockedCollectionService.createItem.mockImplementation(async (_collection, payload) => ({
      id: "order-new",
      ...payload,
    } as any))

    const result = await LabOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      appointmentId: "appt-1",
      clinicalDecision: "lab-required",
    } as any)

    expect(mockedCollectionService.createItem).toHaveBeenCalledWith(
      "labOrders",
      expect.objectContaining({
        patientId: "patient-1",
        patientName: "Budi",
        doctorName: "dr. Ani",
        tests: ["Darah Lengkap"],
        status: "requested",
      }),
    )
    expect(result).toMatchObject({ id: "order-new" })
  })

  it("tidak mengubah order yang sudah completed", async () => {
    mockedCollectionService.list.mockImplementation(async (collection) => {
      if (collection === "labOrders")
        return [{ id: "order-1", medicalRecordId: "mr-1", status: "completed" }] as any
      return [] as any
    })

    const result = await LabOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      clinicalDecision: "lab-required",
    } as any)

    expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
    expect(result).toMatchObject({ id: "order-1", status: "completed" })
  })
})
