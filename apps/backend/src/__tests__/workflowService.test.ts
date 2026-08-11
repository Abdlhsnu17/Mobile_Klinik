import { CollectionService } from "../services/collectionService"
import { WorkflowService } from "../services/workflowService"

jest.mock("../services/collectionService")

const mockedCollectionService = CollectionService as jest.Mocked<typeof CollectionService>

describe("WorkflowService alur pemeriksaan", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("membuat antrean awal tanpa dokter dan layanan", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "patient-1",
      name: "Pasien Baru",
    } as any)
    mockedCollectionService.list.mockResolvedValue([] as any)
    mockedCollectionService.createItem.mockImplementation(async (_collection, payload) => ({
      id: "appt-1",
      ...payload,
    } as any))

    await WorkflowService.registerVisit({
      patientId: "patient-1",
      date: "2026-07-19",
      time: "08:00",
    })

    expect(mockedCollectionService.createItem).toHaveBeenCalledWith(
      "appointments",
      expect.objectContaining({
        patientId: "patient-1",
        doctorId: "",
        doctorName: "Belum ditentukan",
        serviceIds: [],
        serviceNames: [],
        status: "Menunggu",
      }),
    )
  })

  it("hanya memulai pemeriksaan dari status Dipanggil", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "appt-1",
      status: "Dipanggil",
      doctorId: "doctor-1",
      serviceId: "service-1",
      serviceIds: ["service-1"],
    } as any)
    mockedCollectionService.updateItem.mockResolvedValue({
      id: "appt-1",
      status: "Diperiksa",
    } as any)

    await expect(WorkflowService.startExam("appt-1")).resolves.toMatchObject({
      status: "Diperiksa",
    })
    expect(mockedCollectionService.updateItem).toHaveBeenCalledWith(
      "appointments",
      "appt-1",
      { status: "Diperiksa" },
    )
  })

  it.each(["Menunggu", "Diperiksa", "Selesai", "Batal"])(
    "menolak mulai pemeriksaan dari status %s",
    async (status) => {
      mockedCollectionService.findById.mockResolvedValue({
        id: "appt-1",
        status,
      } as any)

      await expect(WorkflowService.startExam("appt-1")).rejects.toMatchObject({
        statusCode: 409,
      })
      expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
    },
  )

  it("menolak mulai pemeriksaan sebelum dokter dan layanan ditentukan", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "appt-1",
      status: "Dipanggil",
      doctorId: "",
      serviceId: "",
      serviceIds: [],
    } as any)

    await expect(WorkflowService.startExam("appt-1")).rejects.toMatchObject({
      statusCode: 409,
      message: "Pemeriksaan awal, dokter, dan layanan harus dilengkapi terlebih dahulu",
    })
    expect(mockedCollectionService.updateItem).not.toHaveBeenCalled()
  })

  it("menolak simpan pemeriksaan bila status belum Diperiksa", async () => {
    mockedCollectionService.findById.mockResolvedValue({
      id: "appt-1",
      status: "Dipanggil",
    } as any)

    await expect(
      WorkflowService.finishExam({
        appointmentId: "appt-1",
        diagnosis: "Gastritis",
        symptoms: "Nyeri ulu hati",
        treatment: "Terapi",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Kunjungan belum dalam status pemeriksaan aktif",
    })
    expect(mockedCollectionService.createItem).not.toHaveBeenCalled()
  })
})
