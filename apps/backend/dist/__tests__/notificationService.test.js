"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const appConfig_1 = require("../config/appConfig");
const collectionService_1 = require("../services/collectionService");
const notificationService_1 = require("../services/notificationService");
jest.mock("nodemailer", () => ({
    __esModule: true,
    default: { createTransport: jest.fn() },
}));
jest.mock("../services/collectionService", () => ({
    CollectionService: {
        findById: jest.fn(),
        list: jest.fn(),
        createItem: jest.fn(),
        updateItem: jest.fn(),
    },
}));
const mockedCollection = collectionService_1.CollectionService;
const mockedCreateTransport = nodemailer_1.default.createTransport;
describe("NotificationService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        appConfig_1.SMTP_CONFIG.host = "smtp.test.local";
        appConfig_1.SMTP_CONFIG.from = "Klinik <noreply@test.local>";
    });
    it("mengirim email pasien lalu menyimpan bukti delivery", async () => {
        const notification = {
            id: "notif-1",
            patientId: "patient-1",
            patientName: "Siti",
            channel: "email",
            message: "Pengingat kontrol",
            targetAt: new Date().toISOString(),
            status: "pending",
            attempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        mockedCollection.findById
            .mockResolvedValueOnce(notification)
            .mockResolvedValueOnce({ id: "patient-1", email: "siti@test.local" });
        mockedCollection.updateItem
            .mockResolvedValueOnce({ ...notification, status: "processing" })
            .mockResolvedValueOnce({ ...notification, status: "sent", sentAt: new Date().toISOString() });
        mockedCreateTransport.mockReturnValue({
            sendMail: jest.fn().mockResolvedValue({ messageId: "smtp-message-1" }),
        });
        const result = await notificationService_1.NotificationService.dispatch("notif-1");
        expect(result.status).toBe("sent");
        expect(mockedCollection.updateItem).toHaveBeenLastCalledWith("patientNotifications", "notif-1", expect.objectContaining({ status: "sent", providerMessageId: "smtp-message-1" }));
    });
    it("menyimpan status failed dan pesan error saat provider gagal", async () => {
        const notification = {
            id: "notif-2",
            patientId: "patient-2",
            patientName: "Budi",
            channel: "email",
            message: "Hasil lab tersedia",
            targetAt: new Date().toISOString(),
            status: "pending",
            attempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        mockedCollection.findById
            .mockResolvedValueOnce(notification)
            .mockResolvedValueOnce({ id: "patient-2", email: "budi@test.local" });
        mockedCollection.updateItem.mockResolvedValue(notification);
        mockedCreateTransport.mockReturnValue({
            sendMail: jest.fn().mockRejectedValue(new Error("SMTP unavailable")),
        });
        await expect(notificationService_1.NotificationService.dispatch("notif-2")).rejects.toThrow("SMTP unavailable");
        expect(mockedCollection.updateItem).toHaveBeenLastCalledWith("patientNotifications", "notif-2", expect.objectContaining({ status: "failed", lastError: "SMTP unavailable" }));
    });
});
//# sourceMappingURL=notificationService.test.js.map