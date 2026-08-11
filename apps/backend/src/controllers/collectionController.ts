import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import type { CollectionName } from "../models/defaultData";
import { AuditService } from "../services/auditService";
import { AuthService } from "../services/authService";
import { BillingService } from "../services/billingService";
import { CollectionService } from "../services/collectionService";
import { LabOrderService } from "../services/labOrderService";
import { LabResultService } from "../services/labResultService";
import { MedicalEquipmentService } from "../services/medicalEquipmentService";
import { NotificationService } from "../services/notificationService";
import { PharmacyService } from "../services/pharmacyService";
import { RadiologyOrderService } from "../services/radiologyOrderService";
import type { LabResult, MedicalRecord, PaymentRecord, PharmacyRequest, RadiologyOrder } from "../types";
import { sanitizeUser } from "../utils";
import { sendSuccess } from "../utils/apiResponse";
import { createHttpError } from "../utils/httpError";

const WORKFLOW_ONLY_APPOINTMENT_STATUSES = ["Diperiksa", "Selesai"]

export class CollectionController {
  static async list<K extends CollectionName>(req: Request, res: Response, collection: K, next: NextFunction) {
    try {
      if (collection === "users") {
        const users = await AuthService.listUsers()
        return sendSuccess(res, users.map(sanitizeUser))
      }

      if (collection === "billingRecords") {
        await BillingService.syncAll()
      }

      const data = await CollectionService.list(collection)
      return sendSuccess(res, data)
    } catch (error) {
      next(error)
    }
  }

  static async getOne<K extends CollectionName>(req: Request, res: Response, collection: K, next: NextFunction) {
    try {
      if (collection === "users") {
        const user = await AuthService.findUserById(req.params.id)
        if (!user) throw createHttpError(404, "Item tidak ditemukan")
        return sendSuccess(res, sanitizeUser(user))
      }

      const item = await CollectionService.findById(collection, req.params.id)
      if (!item) throw createHttpError(404, "Item tidak ditemukan")
      return sendSuccess(res, item)
    } catch (error) {
      next(error)
    }
  }

  static async create<K extends CollectionName>(req: Request, res: Response, collection: K, next: NextFunction) {
    try {
      if (collection === "users") {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const user = await AuthService.createUserWithPassword(req.body, hashedPassword)
        return sendSuccess(res, sanitizeUser(user), 201)
      }

      if (
        collection === "appointments" &&
        typeof req.body.status === "string" &&
        WORKFLOW_ONLY_APPOINTMENT_STATUSES.includes(req.body.status)
      ) {
        throw createHttpError(
          409,
          `Status kunjungan "${req.body.status}" hanya dapat dibuat melalui alur pemeriksaan (/workflows/visits).`,
        )
      }

      if (collection === "billingRecords" && req.body.total !== undefined) {
        throw createHttpError(
          409,
          "Total tagihan dihitung otomatis dan tidak dapat diisi manual. Gunakan endpoint /workflows/billing/sync.",
        )
      }

      const createPayload = collection === "medicalRecords"
        ? { status: "completed", ...req.body }
        : collection === "patientNotifications"
          ? { ...req.body, status: "pending", attempts: 0, sourceType: req.body.sourceType ?? "manual" }
        : req.body
      const item =
        collection === "payments"
          ? await BillingService.recordPayment(createPayload as Partial<PaymentRecord>)
          : await CollectionService.createItem(collection, createPayload)
      if (collection === "medicalRecords") {
        await PharmacyService.createFromMedicalRecord(item as MedicalRecord)
        await LabOrderService.syncFromMedicalRecord(item as MedicalRecord)
        await RadiologyOrderService.syncFromMedicalRecord(item as MedicalRecord)
        await BillingService.syncFromMedicalRecord(item as MedicalRecord)
        await MedicalEquipmentService.syncFromMedicalRecord(item as MedicalRecord)
      }
      if (collection === "labResults") {
        await LabResultService.syncFromResult(item as LabResult)
        await NotificationService.scheduleLabResult(item as LabResult)
      }
      if (collection === "radiologyOrders") {
        await RadiologyOrderService.syncReportToRecord(item as RadiologyOrder)
      }
      if (collection === "appointments") {
        await NotificationService.scheduleAppointmentReminder(item as import("../types").Appointment)
      }
      if (
        collection === "patientNotifications" &&
        new Date((item as import("../types").PatientNotification).targetAt).getTime() <= Date.now()
      ) {
        try {
          await NotificationService.dispatch((item as { id: string }).id)
        } catch {
          // Status dan alasan kegagalan sudah disimpan oleh delivery service.
        }
      }
      await AuditService.record({
        collection,
        itemId: (item as { id: string }).id,
        action: "create",
        user: req.user,
        after: item,
      })
      const responseItem = collection === "patientNotifications"
        ? await CollectionService.findById("patientNotifications", (item as { id: string }).id)
        : item
      return sendSuccess(res, responseItem, 201)
    } catch (error) {
      if (error instanceof Error && error.message.includes("terdaftar")) {
        return next(createHttpError(409, error.message))
      }
      next(error)
    }
  }

  static async update<K extends CollectionName>(req: Request, res: Response, collection: K, next: NextFunction) {
    try {
      if (collection === "users") {
        const payload = { ...req.body }
        if (typeof payload.password === "string" && payload.password) {
          payload.password = await bcrypt.hash(payload.password, 10)
        } else {
          delete payload.password
        }

        // Hanya admin yang boleh mengubah role pengguna. Tanpa ini, pengguna
        // dapat menaikkan role dirinya sendiri lewat endpoint self-update
        // (requireOwnershipOrRole meloloskan update pada record miliknya sendiri).
        if (req.user?.role !== "admin") {
          delete payload.role
        }

        const updated = await AuthService.updateUser(req.params.id, payload)
        if (!updated) throw createHttpError(404, "Item tidak ditemukan")
        return sendSuccess(res, sanitizeUser(updated))
      }

      const before = await CollectionService.findById(collection, req.params.id)
      if (!before) throw createHttpError(404, "Item tidak ditemukan")

      if (collection === "medicalRecords" && (before as MedicalRecord).status === "locked") {
        throw createHttpError(409, "Rekam medis sudah dikunci dan tidak dapat diubah.")
      }

      if (
        collection === "appointments" &&
        typeof req.body.status === "string" &&
        WORKFLOW_ONLY_APPOINTMENT_STATUSES.includes(req.body.status)
      ) {
        throw createHttpError(
          409,
          `Status kunjungan tidak dapat diubah langsung menjadi "${req.body.status}". Gunakan endpoint /workflows/visits/start-exam atau /workflows/visits/finish-exam.`,
        )
      }

      if (collection === "billingRecords" && req.body.total !== undefined) {
        throw createHttpError(
          409,
          "Total tagihan dihitung otomatis dan tidak dapat diubah manual. Gunakan endpoint /workflows/billing/sync.",
        )
      }

      let updatePayload = req.body
      if (collection === "medicalRecords" && req.body.status === "locked") {
        updatePayload = {
          ...req.body,
          lockedAt: new Date().toISOString(),
          lockedBy: req.user?.id,
        }
      }

      let updated =
        collection === "pharmacyRequests" && typeof req.body.status === "string"
          ? ((await PharmacyService.updateStatus(
              req.params.id,
              req.body.status as PharmacyRequest["status"],
              req.body.verificationNotes ?? req.body.dispensingNotes,
            )) as Awaited<ReturnType<typeof CollectionService.updateItem<K>>>)
          : collection === "payments"
            ? ((await BillingService.updatePayment(req.params.id, updatePayload as Partial<PaymentRecord>)) as Awaited<ReturnType<typeof CollectionService.updateItem<K>>>)
          : await CollectionService.updateItem(collection, req.params.id, updatePayload)
      if (!updated) throw createHttpError(404, "Item tidak ditemukan")

      if (collection === "medicalRecords") {
        await PharmacyService.syncFromMedicalRecord(updated as MedicalRecord)
        await LabOrderService.syncFromMedicalRecord(updated as MedicalRecord)
        await RadiologyOrderService.syncFromMedicalRecord(updated as MedicalRecord)
        await BillingService.syncFromMedicalRecord(updated as MedicalRecord)
        await MedicalEquipmentService.syncFromMedicalRecord(updated as MedicalRecord, before as MedicalRecord)
      }
      if (collection === "labResults") {
        await LabResultService.syncFromResult(updated as LabResult)
        const previousOrderId = (before as { labOrderId?: string }).labOrderId
        const currentOrderId = (updated as { labOrderId?: string }).labOrderId
        if (previousOrderId && previousOrderId !== currentOrderId) {
          await LabResultService.syncFromOrderId(previousOrderId)
        }
      }
      if (collection === "radiologyOrders") {
        await RadiologyOrderService.syncReportToRecord(updated as RadiologyOrder)
      }

      await AuditService.record({
        collection,
        itemId: req.params.id,
        action: collection === "medicalRecords" && req.body.status === "locked" ? "lock" : "update",
        user: req.user,
        before,
        after: updated,
        reason: req.body.auditReason,
      })

      return sendSuccess(res, updated)
    } catch (error) {
      next(error)
    }
  }

  static async remove<K extends CollectionName>(req: Request, res: Response, collection: K, next: NextFunction) {
    try {
      if (collection === "users") {
        const deleted = await AuthService.deleteUser(req.params.id)
        if (!deleted) throw createHttpError(404, "Item tidak ditemukan")
        return res.status(204).end()
      }

      const before = await CollectionService.findById(collection, req.params.id)
      if (!before) throw createHttpError(404, "Item tidak ditemukan")
      if (collection === "medicalRecords" && (before as MedicalRecord).status === "locked") {
        throw createHttpError(409, "Rekam medis sudah dikunci dan tidak dapat dihapus.")
      }

      const deleted = await CollectionService.deleteItem(collection, req.params.id)
      if (!deleted) throw createHttpError(404, "Item tidak ditemukan")
      if (collection === "payments") {
        await BillingService.syncByRecordId((before as PaymentRecord).medicalRecordId)
      }
      if (collection === "labResults") {
        const orderId = (before as { labOrderId?: string }).labOrderId
        if (orderId) {
          await LabResultService.syncFromOrderId(orderId)
        }
      }
      if (collection === "medicalRecords") {
        await MedicalEquipmentService.releaseFromMedicalRecord(before as MedicalRecord)
      }
      await AuditService.record({
        collection,
        itemId: req.params.id,
        action: "delete",
        user: req.user,
        before,
      })
      return res.status(204).end()
    } catch (error) {
      next(error)
    }
  }
}
