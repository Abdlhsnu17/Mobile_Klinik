import nodemailer from "nodemailer"
import {
  FRONTEND_URL,
  NOTIFICATION_POLL_INTERVAL_MS,
  SMTP_CONFIG,
  SMS_GATEWAY,
  WHATSAPP_GATEWAY,
} from "../config/appConfig"
import { error as logError, warn } from "../config/logger"
import type { Appointment, LabResult, Patient, PatientNotification } from "../types"
import { now } from "../utils"
import { createHttpError } from "../utils/httpError"
import { CollectionService } from "./collectionService"

const MAX_DELIVERY_ATTEMPTS = 3
const activeDeliveries = new Set<string>()
let scheduler: NodeJS.Timeout | null = null

type DeliveryResult = { messageId?: string }

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  return digits
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function smtpTransport() {
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.from) {
    throw createHttpError(503, "Email belum dikonfigurasi. Isi SMTP_HOST dan SMTP_FROM.")
  }

  return nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.secure,
    ...(SMTP_CONFIG.user
      ? { auth: { user: SMTP_CONFIG.user, pass: SMTP_CONFIG.password } }
      : {}),
  })
}

async function sendEmail(to: string, subject: string, message: string): Promise<DeliveryResult> {
  const result = await smtpTransport().sendMail({
    from: SMTP_CONFIG.from,
    to,
    subject,
    text: message,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p></div>`,
  })
  return { messageId: result.messageId }
}

async function sendViaGateway(
  gateway: { url: string; token: string },
  channel: "WhatsApp" | "SMS",
  to: string,
  message: string,
): Promise<DeliveryResult> {
  if (!gateway.url) {
    throw createHttpError(503, `${channel} gateway belum dikonfigurasi.`)
  }

  const response = await fetch(gateway.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(gateway.token ? { Authorization: `Bearer ${gateway.token}` } : {}),
    },
    body: JSON.stringify({ target: normalizePhone(to), to: normalizePhone(to), message }),
    signal: AbortSignal.timeout(15_000),
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`${channel} gateway merespons ${response.status}: ${body.slice(0, 300)}`)
  }

  try {
    const parsed = JSON.parse(body) as { id?: string; messageId?: string; data?: { id?: string } }
    return { messageId: parsed.messageId ?? parsed.id ?? parsed.data?.id }
  } catch {
    return {}
  }
}

async function getPatient(notification: PatientNotification): Promise<Patient> {
  const patient = await CollectionService.findById("patients", notification.patientId)
  if (!patient) throw createHttpError(404, "Pasien untuk notifikasi tidak ditemukan.")
  return patient
}

export class NotificationService {
  static async sendPasswordReset(email: string, token: string) {
    const publicFrontendUrl = FRONTEND_URL.split(",")[0].replace(/\/$/, "")
    const resetUrl = `${publicFrontendUrl}/lupa-password?token=${encodeURIComponent(token)}`
    return sendEmail(
      email,
      "Reset password SIMKLAB",
      `Gunakan token berikut untuk mereset password Anda: ${token}\n\nAtau buka: ${resetUrl}\n\nToken berlaku selama 1 jam.`,
    )
  }

  static async dispatch(notificationId: string): Promise<PatientNotification> {
    if (activeDeliveries.has(notificationId)) {
      throw createHttpError(409, "Notifikasi sedang dikirim.")
    }

    const notification = await CollectionService.findById("patientNotifications", notificationId)
    if (!notification) throw createHttpError(404, "Notifikasi tidak ditemukan.")
    if (notification.status === "sent") return notification

    activeDeliveries.add(notificationId)
    const attempts = (notification.attempts ?? 0) + 1
    await CollectionService.updateItem("patientNotifications", notificationId, {
      status: "processing",
      attempts,
      lastError: undefined,
    })

    try {
      const patient = await getPatient(notification)
      let result: DeliveryResult
      if (notification.channel === "email") {
        if (!patient.email) throw createHttpError(422, "Pasien tidak memiliki alamat email.")
        result = await sendEmail(patient.email, "Notifikasi dari SIMKLAB", notification.message)
      } else if (notification.channel === "whatsapp") {
        if (!patient.phone) throw createHttpError(422, "Pasien tidak memiliki nomor telepon.")
        result = await sendViaGateway(WHATSAPP_GATEWAY, "WhatsApp", patient.phone, notification.message)
      } else {
        if (!patient.phone) throw createHttpError(422, "Pasien tidak memiliki nomor telepon.")
        result = await sendViaGateway(SMS_GATEWAY, "SMS", patient.phone, notification.message)
      }

      return (await CollectionService.updateItem("patientNotifications", notificationId, {
        status: "sent",
        sentAt: now(),
        lastError: undefined,
        providerMessageId: result.messageId,
      })) as PatientNotification
    } catch (deliveryError) {
      const message = deliveryError instanceof Error ? deliveryError.message : String(deliveryError)
      await CollectionService.updateItem("patientNotifications", notificationId, {
        status: "failed",
        lastError: message.slice(0, 1000),
      })
      throw deliveryError
    } finally {
      activeDeliveries.delete(notificationId)
    }
  }

  static async processDueNotifications() {
    const currentTime = Date.now()
    const notifications = await CollectionService.list("patientNotifications")
    const due = notifications.filter(
      (item) =>
        (item.status === "pending" || item.status === "failed") &&
        (item.attempts ?? 0) < MAX_DELIVERY_ATTEMPTS &&
        new Date(item.targetAt).getTime() <= currentTime,
    )

    await Promise.allSettled(
      due.map(async (item) => {
        try {
          await this.dispatch(item.id)
        } catch (deliveryError) {
          logError("Pengiriman notifikasi pasien gagal", deliveryError, {
            notificationId: item.id,
            channel: item.channel,
          })
        }
      }),
    )
  }

  static startScheduler() {
    if (scheduler) return
    void this.processDueNotifications()
    scheduler = setInterval(() => void this.processDueNotifications(), NOTIFICATION_POLL_INTERVAL_MS)
    scheduler.unref()
  }

  static async scheduleAppointmentReminder(appointment: Appointment) {
    if (appointment.status === "Batal") return null
    const patient = await CollectionService.findById("patients", appointment.patientId)
    if (!patient) return null

    const existing = (await CollectionService.list("patientNotifications")).find(
      (item) => item.sourceType === "appointment_reminder" && item.sourceId === appointment.id,
    )
    if (existing) return existing

    const appointmentAt = new Date(`${appointment.date}T${appointment.time || "00:00"}:00`)
    const targetAt = new Date(Math.max(Date.now(), appointmentAt.getTime() - 24 * 60 * 60 * 1000)).toISOString()
    const channel = patient.phone ? "whatsapp" : patient.email ? "email" : null
    if (!channel) {
      warn("Pengingat janji tidak dibuat karena kontak pasien kosong", { appointmentId: appointment.id })
      return null
    }

    return CollectionService.createItem("patientNotifications", {
      patientId: patient.id,
      patientName: patient.name,
      channel,
      message: `Pengingat janji temu SIMKLAB pada ${appointment.date} pukul ${appointment.time}. Nomor antrean Anda ${appointment.queueNumber}.`,
      targetAt,
      status: "pending",
      attempts: 0,
      sourceType: "appointment_reminder",
      sourceId: appointment.id,
    })
  }

  static async scheduleLabResult(result: LabResult) {
    const patient = await CollectionService.findById("patients", result.patientId)
    if (!patient) return null
    const existing = (await CollectionService.list("patientNotifications")).find(
      (item) => item.sourceType === "lab_result" && item.sourceId === result.id,
    )
    if (existing) return existing

    const channel = patient.email ? "email" : patient.phone ? "whatsapp" : null
    if (!channel) {
      warn("Notifikasi hasil lab tidak dibuat karena kontak pasien kosong", { labResultId: result.id })
      return null
    }

    return CollectionService.createItem("patientNotifications", {
      patientId: patient.id,
      patientName: patient.name,
      channel,
      message: `Hasil laboratorium ${result.testName} sudah tersedia. Silakan hubungi atau kunjungi klinik untuk penjelasan hasil oleh tenaga medis.`,
      targetAt: now(),
      status: "pending",
      attempts: 0,
      sourceType: "lab_result",
      sourceId: result.id,
    })
  }
}
