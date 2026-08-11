"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const appConfig_1 = require("../config/appConfig");
const logger_1 = require("../config/logger");
const utils_1 = require("../utils");
const httpError_1 = require("../utils/httpError");
const collectionService_1 = require("./collectionService");
const MAX_DELIVERY_ATTEMPTS = 3;
const activeDeliveries = new Set();
let scheduler = null;
function normalizePhone(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("0"))
        return `62${digits.slice(1)}`;
    return digits;
}
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
function smtpTransport() {
    if (!appConfig_1.SMTP_CONFIG.host || !appConfig_1.SMTP_CONFIG.from) {
        throw (0, httpError_1.createHttpError)(503, "Email belum dikonfigurasi. Isi SMTP_HOST dan SMTP_FROM.");
    }
    return nodemailer_1.default.createTransport({
        host: appConfig_1.SMTP_CONFIG.host,
        port: appConfig_1.SMTP_CONFIG.port,
        secure: appConfig_1.SMTP_CONFIG.secure,
        ...(appConfig_1.SMTP_CONFIG.user
            ? { auth: { user: appConfig_1.SMTP_CONFIG.user, pass: appConfig_1.SMTP_CONFIG.password } }
            : {}),
    });
}
async function sendEmail(to, subject, message) {
    const result = await smtpTransport().sendMail({
        from: appConfig_1.SMTP_CONFIG.from,
        to,
        subject,
        text: message,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p></div>`,
    });
    return { messageId: result.messageId };
}
async function sendViaGateway(gateway, channel, to, message) {
    if (!gateway.url) {
        throw (0, httpError_1.createHttpError)(503, `${channel} gateway belum dikonfigurasi.`);
    }
    const response = await fetch(gateway.url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(gateway.token ? { Authorization: `Bearer ${gateway.token}` } : {}),
        },
        body: JSON.stringify({ target: normalizePhone(to), to: normalizePhone(to), message }),
        signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    if (!response.ok) {
        throw new Error(`${channel} gateway merespons ${response.status}: ${body.slice(0, 300)}`);
    }
    try {
        const parsed = JSON.parse(body);
        return { messageId: parsed.messageId ?? parsed.id ?? parsed.data?.id };
    }
    catch {
        return {};
    }
}
async function getPatient(notification) {
    const patient = await collectionService_1.CollectionService.findById("patients", notification.patientId);
    if (!patient)
        throw (0, httpError_1.createHttpError)(404, "Pasien untuk notifikasi tidak ditemukan.");
    return patient;
}
class NotificationService {
    static async sendPasswordReset(email, token) {
        const publicFrontendUrl = appConfig_1.FRONTEND_URL.split(",")[0].replace(/\/$/, "");
        const resetUrl = `${publicFrontendUrl}/lupa-password?token=${encodeURIComponent(token)}`;
        return sendEmail(email, "Reset password SIMKLAB", `Gunakan token berikut untuk mereset password Anda: ${token}\n\nAtau buka: ${resetUrl}\n\nToken berlaku selama 1 jam.`);
    }
    static async dispatch(notificationId) {
        if (activeDeliveries.has(notificationId)) {
            throw (0, httpError_1.createHttpError)(409, "Notifikasi sedang dikirim.");
        }
        const notification = await collectionService_1.CollectionService.findById("patientNotifications", notificationId);
        if (!notification)
            throw (0, httpError_1.createHttpError)(404, "Notifikasi tidak ditemukan.");
        if (notification.status === "sent")
            return notification;
        activeDeliveries.add(notificationId);
        const attempts = (notification.attempts ?? 0) + 1;
        await collectionService_1.CollectionService.updateItem("patientNotifications", notificationId, {
            status: "processing",
            attempts,
            lastError: undefined,
        });
        try {
            const patient = await getPatient(notification);
            let result;
            if (notification.channel === "email") {
                if (!patient.email)
                    throw (0, httpError_1.createHttpError)(422, "Pasien tidak memiliki alamat email.");
                result = await sendEmail(patient.email, "Notifikasi dari SIMKLAB", notification.message);
            }
            else if (notification.channel === "whatsapp") {
                if (!patient.phone)
                    throw (0, httpError_1.createHttpError)(422, "Pasien tidak memiliki nomor telepon.");
                result = await sendViaGateway(appConfig_1.WHATSAPP_GATEWAY, "WhatsApp", patient.phone, notification.message);
            }
            else {
                if (!patient.phone)
                    throw (0, httpError_1.createHttpError)(422, "Pasien tidak memiliki nomor telepon.");
                result = await sendViaGateway(appConfig_1.SMS_GATEWAY, "SMS", patient.phone, notification.message);
            }
            return (await collectionService_1.CollectionService.updateItem("patientNotifications", notificationId, {
                status: "sent",
                sentAt: (0, utils_1.now)(),
                lastError: undefined,
                providerMessageId: result.messageId,
            }));
        }
        catch (deliveryError) {
            const message = deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
            await collectionService_1.CollectionService.updateItem("patientNotifications", notificationId, {
                status: "failed",
                lastError: message.slice(0, 1000),
            });
            throw deliveryError;
        }
        finally {
            activeDeliveries.delete(notificationId);
        }
    }
    static async processDueNotifications() {
        const currentTime = Date.now();
        const notifications = await collectionService_1.CollectionService.list("patientNotifications");
        const due = notifications.filter((item) => (item.status === "pending" || item.status === "failed") &&
            (item.attempts ?? 0) < MAX_DELIVERY_ATTEMPTS &&
            new Date(item.targetAt).getTime() <= currentTime);
        await Promise.allSettled(due.map(async (item) => {
            try {
                await this.dispatch(item.id);
            }
            catch (deliveryError) {
                (0, logger_1.error)("Pengiriman notifikasi pasien gagal", deliveryError, {
                    notificationId: item.id,
                    channel: item.channel,
                });
            }
        }));
    }
    static startScheduler() {
        if (scheduler)
            return;
        void this.processDueNotifications();
        scheduler = setInterval(() => void this.processDueNotifications(), appConfig_1.NOTIFICATION_POLL_INTERVAL_MS);
        scheduler.unref();
    }
    static async scheduleAppointmentReminder(appointment) {
        if (appointment.status === "Batal")
            return null;
        const patient = await collectionService_1.CollectionService.findById("patients", appointment.patientId);
        if (!patient)
            return null;
        const existing = (await collectionService_1.CollectionService.list("patientNotifications")).find((item) => item.sourceType === "appointment_reminder" && item.sourceId === appointment.id);
        if (existing)
            return existing;
        const appointmentAt = new Date(`${appointment.date}T${appointment.time || "00:00"}:00`);
        const targetAt = new Date(Math.max(Date.now(), appointmentAt.getTime() - 24 * 60 * 60 * 1000)).toISOString();
        const channel = patient.phone ? "whatsapp" : patient.email ? "email" : null;
        if (!channel) {
            (0, logger_1.warn)("Pengingat janji tidak dibuat karena kontak pasien kosong", { appointmentId: appointment.id });
            return null;
        }
        return collectionService_1.CollectionService.createItem("patientNotifications", {
            patientId: patient.id,
            patientName: patient.name,
            channel,
            message: `Pengingat janji temu SIMKLAB pada ${appointment.date} pukul ${appointment.time}. Nomor antrean Anda ${appointment.queueNumber}.`,
            targetAt,
            status: "pending",
            attempts: 0,
            sourceType: "appointment_reminder",
            sourceId: appointment.id,
        });
    }
    static async scheduleLabResult(result) {
        const patient = await collectionService_1.CollectionService.findById("patients", result.patientId);
        if (!patient)
            return null;
        const existing = (await collectionService_1.CollectionService.list("patientNotifications")).find((item) => item.sourceType === "lab_result" && item.sourceId === result.id);
        if (existing)
            return existing;
        const channel = patient.email ? "email" : patient.phone ? "whatsapp" : null;
        if (!channel) {
            (0, logger_1.warn)("Notifikasi hasil lab tidak dibuat karena kontak pasien kosong", { labResultId: result.id });
            return null;
        }
        return collectionService_1.CollectionService.createItem("patientNotifications", {
            patientId: patient.id,
            patientName: patient.name,
            channel,
            message: `Hasil laboratorium ${result.testName} sudah tersedia. Silakan hubungi atau kunjungi klinik untuk penjelasan hasil oleh tenaga medis.`,
            targetAt: (0, utils_1.now)(),
            status: "pending",
            attempts: 0,
            sourceType: "lab_result",
            sourceId: result.id,
        });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notificationService.js.map