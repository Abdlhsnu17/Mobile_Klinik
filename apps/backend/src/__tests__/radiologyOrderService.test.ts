import { CollectionService } from "../services/collectionService"
import { RadiologyOrderService } from "../services/radiologyOrderService"

jest.mock("../services/collectionService")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>

describe("RadiologyOrderService.syncFromMedicalRecord", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("tidak membuat order radiologi bila keputusan klinis bukan radiology-required", async () => {
    mockedCollectionService.list.mockResolvedValue([] as any)

    const result = await RadiologyOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      clinicalDecision: "prescription",
    } as any)

    expect(result).toBeNull()
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
  })

  it("membatalkan order radiologi yang masih requested bila keputusan klinis berubah", async () => {
    mockedCollectionService.list.mockResolvedValue([
      { id: "order-1", medicalRecordId: "mr-1", status: "requested" },
    ] as any)
    mockedCollectionService.updateItem.mockResolvedValue({
      id: "order-1",
      status: "cancelled",
    } as any)

    const result = await RadiologyOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      clinicalDecision: "prescription",
    } as any)

    expect(mockedCollectionService.updateItem).toHaveBeenCalledWith(
      "radiologyOrders",
      "order-1",
      expect.objectContaining({ status: "cancelled" }),
    )
    expect(result).toMatchObject({ status: "cancelled" })
  })

  it("membuat order radiologi baru saat keputusan klinis radiology-required", async () => {
    mockedCollectionService.list.mockImplementation(async (collection) => {
      if (collection === "radiologyOrders") return [] as any
      if (collection === "services")
        return [{ id: "svc-1", name: "Rontgen Thorax", category: "Radiologi" }] as any
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

    const result = await RadiologyOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      appointmentId: "appt-1",
      diagnosis: "Suspek pneumonia",
      clinicalDecision: "radiology-required",
    } as any)

    expect(mockedCollectionService.createItem).toHaveBeenCalledWith(
      "radiologyOrders",
      expect.objectContaining({
        patientId: "patient-1",
        patientName: "Budi",
        doctorName: "dr. Ani",
        study: "Rontgen Thorax",
        indication: "Suspek pneumonia",
        status: "requested",
      }),
    )
    expect(result).toMatchObject({ id: "order-new" })
  })

  it("tidak mengubah order yang sudah reported", async () => {
    mockedCollectionService.list.mockImplementation(async (collection) => {
      if (collection === "radiologyOrders")
        return [{ id: "order-1", medicalRecordId: "mr-1", status: "reported" }] as any
      return [] as any
    })

    const result = await RadiologyOrderService.syncFromMedicalRecord({
      id: "mr-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      clinicalDecision: "radiology-required",
    } as any)

    expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
    expect(result).toMatchObject({ id: "order-1", status: "reported" })
  })
})

describe("RadiologyOrderService.syncReportToRecord", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("tidak menulis catatan bila order belum memiliki hasil bacaan", async () => {
    const result = await RadiologyOrderService.syncReportToRecord({
      id: "order-1",
      medicalRecordId: "mr-1",
      status: "scheduled",
    } as any)

    expect(result).toBeNull()
    expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
  })

  it("menulis catatan hasil radiologi ke rekam medis saat order reported", async () => {
    mockedCollectionService.findById.mockResolvedValue({ id: "mr-1", notes: "Catatan awal" } as any)
    mockedCollectionService.updateItem.mockImplementation(async (_collection, _id, payload) => ({
      id: "mr-1",
      ...payload,
    } as any))

    const result = await RadiologyOrderService.syncReportToRecord({
      id: "order-1",
      medicalRecordId: "mr-1",
      status: "reported",
      findings: "Tidak tampak infiltrat",
      doctorName: "dr. Ani",
    } as any)

    expect(mockedCollectionService.updateItem).toHaveBeenCalledWith(
      "medicalRecords",
      "mr-1",
      expect.objectContaining({ notes: expect.stringContaining("Hasil radiologi untuk order order-1") }),
    )
    expect((result as any).notes).toContain("Catatan awal")
  })

  it("idempoten: tidak menduplikasi catatan yang sudah ada", async () => {
    const existingNote = "Hasil radiologi untuk order order-1 telah direview oleh dr. Ani pada 2026-07-24."
    mockedCollectionService.findById.mockResolvedValue({ id: "mr-1", notes: existingNote } as any)

    const result = await RadiologyOrderService.syncReportToRecord({
      id: "order-1",
      medicalRecordId: "mr-1",
      status: "reviewed",
      impression: "Normal",
      reviewedAt: "2026-07-24",
      reviewedByDoctorName: "dr. Ani",
    } as any)

    expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
    expect(result).toMatchObject({ id: "mr-1" })
  })
})
