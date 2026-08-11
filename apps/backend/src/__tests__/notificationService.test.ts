import nodemailer from "nodemailer"
import { SMTP_CONFIG } from "../config/appConfig"
import { CollectionService } from "../services/collectionService"
import { NotificationService } from "../services/notificationService"

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}))

jest.mock("../services/collectionService", () => ({
  CollectionService: {
    findById: jest.fn(),
    list: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
  },
}))

const mockedCollection = CollectionService as jest.Mocked<typeof CollectionService>
const mockedCreateTransport = nodemailer.createTransport as jest.Mock

describe("NotificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    SMTP_CONFIG.host = "smtp.test.local"
    SMTP_CONFIG.from = "Klinik <noreply@test.local>"
  })

  it("mengirim email pasien lalu menyimpan bukti delivery", async () => {
    const notification = {
      id: "notif-1",
      patientId: "patient-1",
      patientName: "Siti",
      channel: "email" as const,
      message: "Pengingat kontrol",
      targetAt: new Date().toISOString(),
      status: "pending" as const,
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockedCollection.findById
      .mockResolvedValueOnce(notification as never)
      .mockResolvedValueOnce({ id: "patient-1", email: "siti@test.local" } as never)
    mockedCollection.updateItem
      .mockResolvedValueOnce({ ...notification, status: "processing" } as never)
      .mockResolvedValueOnce({ ...notification, status: "sent", sentAt: new Date().toISOString() } as never)
    mockedCreateTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: "smtp-message-1" }),
    })

    const result = await NotificationService.dispatch("notif-1")

    expect(result.status).toBe("sent")
    expect(mockedCollection.updateItem).toHaveBeenLastCalledWith(
      "patientNotifications",
      "notif-1",
      expect.objectContaining({ status: "sent", providerMessageId: "smtp-message-1" }),
    )
  })

  it("menyimpan status failed dan pesan error saat provider gagal", async () => {
    const notification = {
      id: "notif-2",
      patientId: "patient-2",
      patientName: "Budi",
      channel: "email" as const,
      message: "Hasil lab tersedia",
      targetAt: new Date().toISOString(),
      status: "pending" as const,
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockedCollection.findById
      .mockResolvedValueOnce(notification as never)
      .mockResolvedValueOnce({ id: "patient-2", email: "budi@test.local" } as never)
    mockedCollection.updateItem.mockResolvedValue(notification as never)
    mockedCreateTransport.mockReturnValue({
      sendMail: jest.fn().mockRejectedValue(new Error("SMTP unavailable")),
    })

    await expect(NotificationService.dispatch("notif-2")).rejects.toThrow("SMTP unavailable")
    expect(mockedCollection.updateItem).toHaveBeenLastCalledWith(
      "patientNotifications",
      "notif-2",
      expect.objectContaining({ status: "failed", lastError: "SMTP unavailable" }),
    )
  })
})
