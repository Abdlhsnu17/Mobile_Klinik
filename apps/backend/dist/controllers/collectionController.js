"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auditService_1 = require("../services/auditService");
const authService_1 = require("../services/authService");
const billingService_1 = require("../services/billingService");
const collectionService_1 = require("../services/collectionService");
const labOrderService_1 = require("../services/labOrderService");
const labResultService_1 = require("../services/labResultService");
const medicalEquipmentService_1 = require("../services/medicalEquipmentService");
const notificationService_1 = require("../services/notificationService");
const pharmacyService_1 = require("../services/pharmacyService");
const radiologyOrderService_1 = require("../services/radiologyOrderService");
const utils_1 = require("../utils");
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const WORKFLOW_ONLY_APPOINTMENT_STATUSES = ["Diperiksa", "Selesai"];
class CollectionController {
    static async list(req, res, collection, next) {
        try {
            if (collection === "users") {
                const users = await authService_1.AuthService.listUsers();
                return (0, apiResponse_1.sendSuccess)(res, users.map(utils_1.sanitizeUser));
            }
            if (collection === "billingRecords") {
                await billingService_1.BillingService.syncAll();
            }
            const data = await collectionService_1.CollectionService.list(collection);
            return (0, apiResponse_1.sendSuccess)(res, data);
        }
        catch (error) {
            next(error);
        }
    }
    static async getOne(req, res, collection, next) {
        try {
            if (collection === "users") {
                const user = await authService_1.AuthService.findUserById(req.params.id);
                if (!user)
                    throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
                return (0, apiResponse_1.sendSuccess)(res, (0, utils_1.sanitizeUser)(user));
            }
            const item = await collectionService_1.CollectionService.findById(collection, req.params.id);
            if (!item)
                throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
            return (0, apiResponse_1.sendSuccess)(res, item);
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, collection, next) {
        try {
            if (collection === "users") {
                const hashedPassword = await bcryptjs_1.default.hash(req.body.password, 10);
                const user = await authService_1.AuthService.createUserWithPassword(req.body, hashedPassword);
                return (0, apiResponse_1.sendSuccess)(res, (0, utils_1.sanitizeUser)(user), 201);
            }
            if (collection === "appointments" &&
                typeof req.body.status === "string" &&
                WORKFLOW_ONLY_APPOINTMENT_STATUSES.includes(req.body.status)) {
                throw (0, httpError_1.createHttpError)(409, `Status kunjungan "${req.body.status}" hanya dapat dibuat melalui alur pemeriksaan (/workflows/visits).`);
            }
            if (collection === "billingRecords" && req.body.total !== undefined) {
                throw (0, httpError_1.createHttpError)(409, "Total tagihan dihitung otomatis dan tidak dapat diisi manual. Gunakan endpoint /workflows/billing/sync.");
            }
            const createPayload = collection === "medicalRecords"
                ? { status: "completed", ...req.body }
                : collection === "patientNotifications"
                    ? { ...req.body, status: "pending", attempts: 0, sourceType: req.body.sourceType ?? "manual" }
                    : req.body;
            const item = collection === "payments"
                ? await billingService_1.BillingService.recordPayment(createPayload)
                : await collectionService_1.CollectionService.createItem(collection, createPayload);
            if (collection === "medicalRecords") {
                await pharmacyService_1.PharmacyService.createFromMedicalRecord(item);
                await labOrderService_1.LabOrderService.syncFromMedicalRecord(item);
                await radiologyOrderService_1.RadiologyOrderService.syncFromMedicalRecord(item);
                await billingService_1.BillingService.syncFromMedicalRecord(item);
                await medicalEquipmentService_1.MedicalEquipmentService.syncFromMedicalRecord(item);
            }
            if (collection === "labResults") {
                await labResultService_1.LabResultService.syncFromResult(item);
                await notificationService_1.NotificationService.scheduleLabResult(item);
            }
            if (collection === "radiologyOrders") {
                await radiologyOrderService_1.RadiologyOrderService.syncReportToRecord(item);
            }
            if (collection === "appointments") {
                await notificationService_1.NotificationService.scheduleAppointmentReminder(item);
            }
            if (collection === "patientNotifications" &&
                new Date(item.targetAt).getTime() <= Date.now()) {
                try {
                    await notificationService_1.NotificationService.dispatch(item.id);
                }
                catch {
                    // Status dan alasan kegagalan sudah disimpan oleh delivery service.
                }
            }
            await auditService_1.AuditService.record({
                collection,
                itemId: item.id,
                action: "create",
                user: req.user,
                after: item,
            });
            const responseItem = collection === "patientNotifications"
                ? await collectionService_1.CollectionService.findById("patientNotifications", item.id)
                : item;
            return (0, apiResponse_1.sendSuccess)(res, responseItem, 201);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes("terdaftar")) {
                return next((0, httpError_1.createHttpError)(409, error.message));
            }
            next(error);
        }
    }
    static async update(req, res, collection, next) {
        try {
            if (collection === "users") {
                const payload = { ...req.body };
                if (typeof payload.password === "string" && payload.password) {
                    payload.password = await bcryptjs_1.default.hash(payload.password, 10);
                }
                else {
                    delete payload.password;
                }
                // Hanya admin yang boleh mengubah role pengguna. Tanpa ini, pengguna
                // dapat menaikkan role dirinya sendiri lewat endpoint self-update
                // (requireOwnershipOrRole meloloskan update pada record miliknya sendiri).
                if (req.user?.role !== "admin") {
                    delete payload.role;
                }
                const updated = await authService_1.AuthService.updateUser(req.params.id, payload);
                if (!updated)
                    throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
                return (0, apiResponse_1.sendSuccess)(res, (0, utils_1.sanitizeUser)(updated));
            }
            const before = await collectionService_1.CollectionService.findById(collection, req.params.id);
            if (!before)
                throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
            if (collection === "medicalRecords" && before.status === "locked") {
                throw (0, httpError_1.createHttpError)(409, "Rekam medis sudah dikunci dan tidak dapat diubah.");
            }
            if (collection === "appointments" &&
                typeof req.body.status === "string" &&
                WORKFLOW_ONLY_APPOINTMENT_STATUSES.includes(req.body.status)) {
                throw (0, httpError_1.createHttpError)(409, `Status kunjungan tidak dapat diubah langsung menjadi "${req.body.status}". Gunakan endpoint /workflows/visits/start-exam atau /workflows/visits/finish-exam.`);
            }
            if (collection === "billingRecords" && req.body.total !== undefined) {
                throw (0, httpError_1.createHttpError)(409, "Total tagihan dihitung otomatis dan tidak dapat diubah manual. Gunakan endpoint /workflows/billing/sync.");
            }
            let updatePayload = req.body;
            if (collection === "medicalRecords" && req.body.status === "locked") {
                updatePayload = {
                    ...req.body,
                    lockedAt: new Date().toISOString(),
                    lockedBy: req.user?.id,
                };
            }
            let updated = collection === "pharmacyRequests" && typeof req.body.status === "string"
                ? (await pharmacyService_1.PharmacyService.updateStatus(req.params.id, req.body.status, req.body.verificationNotes ?? req.body.dispensingNotes))
                : collection === "payments"
                    ? (await billingService_1.BillingService.updatePayment(req.params.id, updatePayload))
                    : await collectionService_1.CollectionService.updateItem(collection, req.params.id, updatePayload);
            if (!updated)
                throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
            if (collection === "medicalRecords") {
                await pharmacyService_1.PharmacyService.syncFromMedicalRecord(updated);
                await labOrderService_1.LabOrderService.syncFromMedicalRecord(updated);
                await radiologyOrderService_1.RadiologyOrderService.syncFromMedicalRecord(updated);
                await billingService_1.BillingService.syncFromMedicalRecord(updated);
                await medicalEquipmentService_1.MedicalEquipmentService.syncFromMedicalRecord(updated, before);
            }
            if (collection === "labResults") {
                await labResultService_1.LabResultService.syncFromResult(updated);
                const previousOrderId = before.labOrderId;
                const currentOrderId = updated.labOrderId;
                if (previousOrderId && previousOrderId !== currentOrderId) {
                    await labResultService_1.LabResultService.syncFromOrderId(previousOrderId);
                }
            }
            if (collection === "radiologyOrders") {
                await radiologyOrderService_1.RadiologyOrderService.syncReportToRecord(updated);
            }
            await auditService_1.AuditService.record({
                collection,
                itemId: req.params.id,
                action: collection === "medicalRecords" && req.body.status === "locked" ? "lock" : "update",
                user: req.user,
                before,
                after: updated,
                reason: req.body.auditReason,
            });
            return (0, apiResponse_1.sendSuccess)(res, updated);
        }
        catch (error) {
            next(error);
        }
    }
    static async remove(req, res, collection, next) {
        try {
            if (collection === "users") {
                const deleted = await authService_1.AuthService.deleteUser(req.params.id);
                if (!deleted)
                    throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
                return res.status(204).end();
            }
            const before = await collectionService_1.CollectionService.findById(collection, req.params.id);
            if (!before)
                throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
            if (collection === "medicalRecords" && before.status === "locked") {
                throw (0, httpError_1.createHttpError)(409, "Rekam medis sudah dikunci dan tidak dapat dihapus.");
            }
            const deleted = await collectionService_1.CollectionService.deleteItem(collection, req.params.id);
            if (!deleted)
                throw (0, httpError_1.createHttpError)(404, "Item tidak ditemukan");
            if (collection === "payments") {
                await billingService_1.BillingService.syncByRecordId(before.medicalRecordId);
            }
            if (collection === "labResults") {
                const orderId = before.labOrderId;
                if (orderId) {
                    await labResultService_1.LabResultService.syncFromOrderId(orderId);
                }
            }
            if (collection === "medicalRecords") {
                await medicalEquipmentService_1.MedicalEquipmentService.releaseFromMedicalRecord(before);
            }
            await auditService_1.AuditService.record({
                collection,
                itemId: req.params.id,
                action: "delete",
                user: req.user,
                before,
            });
            return res.status(204).end();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CollectionController = CollectionController;
//# sourceMappingURL=collectionController.js.map